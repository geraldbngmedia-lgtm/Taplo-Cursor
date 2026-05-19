import type { RecallDesktopClient, RecordingStartResult } from "./recall-desktop";
import type { TranscriptSegment } from "@/lib/workspace/types";

type RecallDesktopSdk = {
  startRecording(input: { sessionId: string }): Promise<RecordingStartResult>;
  stopRecording(input: { sessionId: string }): Promise<{ transcriptSegments: TranscriptSegment[] }>;
};

export function createRecallDesktopSdkClient(sdk: RecallDesktopSdk): RecallDesktopClient {
  return {
    startRecording(sessionId) {
      return sdk.startRecording({ sessionId });
    },
    async stopRecording(sessionId) {
      const result = await sdk.stopRecording({ sessionId });
      return result.transcriptSegments;
    },
  };
}
