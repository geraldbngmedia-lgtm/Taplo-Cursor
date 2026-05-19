import RecallAiSdk, { type RecallAiSdkWindow } from "@recallai/desktop-sdk";

type UploadTokenResponse = {
  id: string;
  recordingId?: string;
  uploadToken: string;
  apiBaseUrl: string;
};

export type RecallRecordingStartResult = {
  mode: "recall";
  recallUploadId: string;
  externalRecordingId?: string;
  recallWindowId: string;
  recallApiBaseUrl: string;
};

export type RecallRecordingStopResult = {
  mode: "recall";
  recallUploadId: string;
  externalRecordingId?: string;
  recallWindowId: string;
};

type ActiveRecording = RecallRecordingStartResult;

const REGION_HOSTS: Record<string, string> = {
  "us-east-1": "https://us-east-1.recall.ai",
  "us-west-2": "https://us-west-2.recall.ai",
  "eu-central-1": "https://eu-central-1.recall.ai",
  "ap-northeast-1": "https://ap-northeast-1.recall.ai",
};

export class RecallDesktopRecorder {
  private initializedApiBaseUrl?: string;
  private latestMeetingWindow?: RecallAiSdkWindow;
  private activeRecordings = new Map<string, ActiveRecording>();

  async initialize(apiBaseUrl = getDefaultRecallApiBaseUrl()) {
    if (this.initializedApiBaseUrl === apiBaseUrl) {
      return;
    }

    RecallAiSdk.removeAllEventListeners();
    RecallAiSdk.addEventListener("meeting-detected", (event) => {
      this.latestMeetingWindow = event.window;
    });
    RecallAiSdk.addEventListener("meeting-updated", (event) => {
      this.latestMeetingWindow = event.window;
    });
    RecallAiSdk.addEventListener("error", (event) => {
      console.error("Recall Desktop SDK error:", event.message);
    });

    await RecallAiSdk.init({
      apiUrl: apiBaseUrl,
      restartOnError: true,
    });
    this.initializedApiBaseUrl = apiBaseUrl;
  }

  async start(input: { sessionId: string; meetingId: string; backendApiBaseUrl: string }): Promise<RecallRecordingStartResult> {
    const upload = await createDesktopSdkUpload(input.backendApiBaseUrl, {
      session_id: input.sessionId,
      meeting_id: input.meetingId,
    });
    await this.initialize(upload.apiBaseUrl);

    const windowId = this.latestMeetingWindow?.id ?? (await RecallAiSdk.prepareDesktopAudioRecording());
    await RecallAiSdk.startRecording({
      windowId,
      uploadToken: upload.uploadToken,
    });

    const result: RecallRecordingStartResult = {
      mode: "recall",
      recallUploadId: upload.id,
      externalRecordingId: upload.recordingId,
      recallWindowId: windowId,
      recallApiBaseUrl: upload.apiBaseUrl,
    };
    this.activeRecordings.set(input.sessionId, result);
    return result;
  }

  async pause(sessionId: string) {
    const recording = this.activeRecordings.get(sessionId);
    if (!recording) {
      return;
    }

    await RecallAiSdk.pauseRecording({ windowId: recording.recallWindowId });
  }

  async resume(sessionId: string) {
    const recording = this.activeRecordings.get(sessionId);
    if (!recording) {
      return;
    }

    await RecallAiSdk.resumeRecording({ windowId: recording.recallWindowId });
  }

  async stop(sessionId: string): Promise<RecallRecordingStopResult | undefined> {
    const recording = this.activeRecordings.get(sessionId);
    if (!recording) {
      return undefined;
    }

    await RecallAiSdk.stopRecording({ windowId: recording.recallWindowId });
    this.activeRecordings.delete(sessionId);

    return {
      mode: "recall",
      recallUploadId: recording.recallUploadId,
      externalRecordingId: recording.externalRecordingId,
      recallWindowId: recording.recallWindowId,
    };
  }
}

async function createDesktopSdkUpload(backendApiBaseUrl: string, metadata: Record<string, string>) {
  const response = await fetch(`${backendApiBaseUrl}/api/recall/desktop-upload`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ metadata }),
  });
  const payload = (await response.json()) as Partial<UploadTokenResponse> & { error?: string };

  if (!response.ok || !payload.uploadToken || !payload.id || !payload.apiBaseUrl) {
    throw new Error(payload.error || `Recall Desktop upload creation failed with ${response.status}.`);
  }

  return {
    id: payload.id,
    recordingId: payload.recordingId,
    uploadToken: payload.uploadToken,
    apiBaseUrl: payload.apiBaseUrl,
  };
}

function getDefaultRecallApiBaseUrl() {
  return process.env.RECALL_API_BASE_URL || REGION_HOSTS[process.env.RECALL_REGION || "eu-central-1"] || REGION_HOSTS["eu-central-1"];
}
