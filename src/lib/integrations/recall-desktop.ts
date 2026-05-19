import type { TranscriptSegment } from "@/lib/workspace/types";

export type RecordingStartResult = {
  externalRecordingId: string;
};

export type RecallDesktopClient = {
  startRecording(sessionId: string): Promise<RecordingStartResult>;
  stopRecording(sessionId: string): Promise<TranscriptSegment[]>;
};

export function createMockRecallDesktopClient(): RecallDesktopClient {
  return {
    async startRecording(sessionId) {
      return {
        externalRecordingId: `mock-recall-${sessionId}`,
      };
    },
    async stopRecording(sessionId) {
      return createMockTranscript(sessionId);
    },
  };
}

export function createMockTranscript(sessionId: string): TranscriptSegment[] {
  const base = Date.now();
  const segments: TranscriptSegment[] = [
    {
      id: crypto.randomUUID(),
      sessionId,
      speaker: "Interviewer",
      text: "Can you walk me through the most relevant project for this role?",
      startMs: 0,
      endMs: 4500,
      final: true,
    },
    {
      id: crypto.randomUUID(),
      sessionId,
      speaker: "Candidate",
      text: "I led a TypeScript migration for a hiring platform and coordinated delivery across product, design, and QA.",
      startMs: 4600,
      endMs: 12800,
      final: true,
    },
    {
      id: crypto.randomUUID(),
      sessionId,
      speaker: "Interviewer",
      text: "What trade-offs did you make during the rollout?",
      startMs: 13000,
      endMs: 16600,
      final: true,
    },
    {
      id: crypto.randomUUID(),
      sessionId,
      speaker: "Candidate",
      text: "We used feature flags and migrated one workflow at a time so recruiters could continue using the product during the rollout.",
      startMs: 17000,
      endMs: 24500,
      final: true,
    },
  ];

  return segments.map((segment, index) => ({
    ...segment,
    id: `${base}-${index}-${segment.id}`,
  }));
}
