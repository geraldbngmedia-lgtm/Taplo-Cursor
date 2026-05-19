type RecallRequestFn = <T>(pathname: string, init?: { method?: string; body?: Record<string, unknown> }) => Promise<T>;

export type RecallTranscriptSegment = {
  speaker: "Interviewer" | "Candidate" | "System";
  text: string;
  startMs: number;
  endMs: number;
};

type SdkUpload = {
  id: string;
  recording_id?: string | null;
  status?: { code?: string } | { status?: { code?: string } };
};

type TranscriptListItem = {
  id: string;
  status?: { code?: string };
  data?: { download_url?: string };
};

type TranscriptRetrieve = {
  id: string;
  status?: { code?: string };
  data?: { download_url?: string };
};

type RecallWord = {
  text?: string;
  start_timestamp?: { relative?: number };
  end_timestamp?: { relative?: number };
};

type RecallParticipantBlock = {
  participant?: {
    name?: string | null;
    is_host?: boolean | null;
  };
  words?: RecallWord[];
};

const UPLOAD_POLL_MS = 3_000;
const UPLOAD_MAX_MS = 3 * 60_000;
const TRANSCRIPT_POLL_MS = 5_000;
const TRANSCRIPT_MAX_MS = 6 * 60_000;

export function createRecallTranscriptService(recallRequest: RecallRequestFn) {
  return {
    fetchSessionTranscript,
  };

  async function fetchSessionTranscript(input: { recallUploadId: string; recordingId?: string }) {
    const upload = await waitForSdkUploadComplete(input.recallUploadId);
    const recordingId = upload.recording_id ?? input.recordingId;

    if (!recordingId) {
      throw new Error("Recall upload completed but no recording id was returned.");
    }

    let transcript = await findCompletedTranscript(recordingId);

    if (!transcript) {
      await createAsyncTranscript(recordingId);
      transcript = await waitForCompletedTranscript(recordingId);
    }

    const downloadUrl = await resolveTranscriptDownloadUrl(transcript);
    const segments = await downloadAndParseTranscript(downloadUrl);

    if (!segments.length) {
      throw new Error("Recall transcript completed but contained no speech segments.");
    }

    return {
      recordingId,
      transcriptId: transcript.id,
      segments,
    };
  }

  async function waitForSdkUploadComplete(uploadId: string) {
    const started = Date.now();

    while (Date.now() - started < UPLOAD_MAX_MS) {
      const upload = await recallRequest<SdkUpload>(`/api/v1/sdk_upload/${uploadId}/`);
      const code = readStatusCode(upload.status);

      if (code === "complete") {
        return upload;
      }

      if (code === "failed") {
        throw new Error("Recall desktop upload failed before transcript could be retrieved.");
      }

      await sleep(UPLOAD_POLL_MS);
    }

    throw new Error("Timed out waiting for Recall upload to complete.");
  }

  async function createAsyncTranscript(recordingId: string) {
    try {
      await recallRequest(`/api/v1/recording/${recordingId}/create_transcript/`, {
        method: "POST",
        body: {
          provider: {
            recallai_async: {
              language_code: "auto",
            },
          },
          diarization: {
            use_separate_streams_when_available: true,
          },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start Recall transcription.";
      if (!/already|exist|limit/i.test(message)) {
        throw error;
      }
    }
  }

  async function findCompletedTranscript(recordingId: string) {
    const payload = await recallRequest<{ results?: TranscriptListItem[] }>(
      `/api/v1/transcript/?recording_id=${encodeURIComponent(recordingId)}`,
    );
    const items = payload.results ?? [];

    return items.find((item) => readStatusCode(item.status) === "done") ?? items[0];
  }

  async function waitForCompletedTranscript(recordingId: string) {
    const started = Date.now();

    while (Date.now() - started < TRANSCRIPT_MAX_MS) {
      const transcript = await findCompletedTranscript(recordingId);

      if (!transcript) {
        await sleep(TRANSCRIPT_POLL_MS);
        continue;
      }

      const code = readStatusCode(transcript.status);

      if (code === "done") {
        return transcript;
      }

      if (code === "failed") {
        throw new Error("Recall transcription failed for this recording.");
      }

      await sleep(TRANSCRIPT_POLL_MS);
    }

    throw new Error("Timed out waiting for Recall transcript to complete.");
  }

  async function resolveTranscriptDownloadUrl(transcript: TranscriptListItem) {
    if (transcript.data?.download_url) {
      return transcript.data.download_url;
    }

    const retrieved = await recallRequest<TranscriptRetrieve>(`/api/v1/transcript/${transcript.id}/`);
    const downloadUrl = retrieved.data?.download_url;

    if (!downloadUrl) {
      throw new Error("Recall transcript is ready but no download URL was provided.");
    }

    return downloadUrl;
  }

  async function downloadAndParseTranscript(downloadUrl: string) {
    const response = await fetch(downloadUrl);

    if (!response.ok) {
      throw new Error(`Failed to download Recall transcript (${response.status}).`);
    }

    const payload = (await response.json()) as unknown;
    return parseRecallTranscriptPayload(payload);
  }
}

function parseRecallTranscriptPayload(payload: unknown): RecallTranscriptSegment[] {
  const blocks = Array.isArray(payload) ? payload : [];

  return blocks
    .map((block) => {
      if (!isRecord(block)) {
        return null;
      }

      const participant = isRecord(block.participant) ? block.participant : {};
      const words = Array.isArray(block.words) ? (block.words as RecallWord[]) : [];
      const text = words
        .map((word) => (typeof word.text === "string" ? word.text : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (!text) {
        return null;
      }

      const startMs = Math.max(0, Math.round((words[0]?.start_timestamp?.relative ?? 0) * 1000));
      const endMs = Math.max(startMs + 1, Math.round((words[words.length - 1]?.end_timestamp?.relative ?? 0) * 1000));

      return {
        speaker: mapRecallSpeaker(participant.is_host, participant.name),
        text,
        startMs,
        endMs,
      } satisfies RecallTranscriptSegment;
    })
    .filter((segment): segment is RecallTranscriptSegment => Boolean(segment));
}

function mapRecallSpeaker(isHost: unknown, name: unknown): RecallTranscriptSegment["speaker"] {
  if (isHost === true) {
    return "Interviewer";
  }

  if (isHost === false) {
    return "Candidate";
  }

  const normalized = typeof name === "string" ? name.toLowerCase() : "";

  if (normalized.includes("recruit") || normalized.includes("interviewer") || normalized.includes("host")) {
    return "Interviewer";
  }

  if (normalized.includes("candidate")) {
    return "Candidate";
  }

  return "Candidate";
}

function readStatusCode(status: unknown) {
  if (!isRecord(status)) {
    return "";
  }

  if (typeof status.code === "string") {
    return status.code;
  }

  if (isRecord(status.status) && typeof status.status.code === "string") {
    return status.status.code;
  }

  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
