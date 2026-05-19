type RecallTranscriptSegment = {
  speaker: "Interviewer" | "Candidate" | "System";
  text: string;
  startMs: number;
  endMs: number;
};

type FetchSessionTranscriptResponse = {
  recordingId: string;
  transcriptId: string;
  segments: RecallTranscriptSegment[];
  error?: string;
};

export async function fetchRecallSessionTranscript(input: {
  backendApiBaseUrl: string;
  recallUploadId: string;
  recordingId?: string;
}) {
  const response = await fetch(`${input.backendApiBaseUrl}/api/recall/fetch-session-transcript`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recallUploadId: input.recallUploadId,
      recordingId: input.recordingId,
    }),
  });
  const payload = (await response.json()) as FetchSessionTranscriptResponse & { error?: string };

  if (!response.ok || !payload.segments) {
    throw new Error(payload.error || `Recall transcript fetch failed with ${response.status}.`);
  }

  return payload;
}
