import type { AnalysisOutput, CalendarProvider, LiveGuidance, Meeting, Session, TranscriptSegment, WorkspaceData } from "@/lib/workspace/types";

declare global {
  interface Window {
    taplo?: {
      workspace: {
        load(): Promise<WorkspaceData>;
        save(data: WorkspaceData): Promise<WorkspaceData>;
        addMeeting(meeting: Meeting): Promise<WorkspaceData>;
        updateMeeting(
          meetingId: string,
          patch: Partial<Pick<Meeting, "candidateName" | "roleTitle" | "jobDescription" | "candidateCv" | "recruiterNotes">>,
        ): Promise<WorkspaceData>;
        startRecording(meetingId: string): Promise<{ workspace: WorkspaceData; session: Session }>;
        pauseRecording(sessionId: string): Promise<{ workspace: WorkspaceData; session: Session }>;
        resumeRecording(sessionId: string): Promise<{ workspace: WorkspaceData; session: Session }>;
        stopRecording(sessionId: string): Promise<{
          workspace: WorkspaceData;
          session: Session;
          transcriptSegments: TranscriptSegment[];
        }>;
        requestLiveGuidance(sessionId: string): Promise<{ workspace: WorkspaceData; guidance: LiveGuidance }>;
        analyzeSession(sessionId: string): Promise<{ workspace: WorkspaceData; analysis: AnalysisOutput }>;
        connectCalendar(provider: CalendarProvider): Promise<WorkspaceData>;
        disconnectCalendar(connectionId: string): Promise<WorkspaceData>;
        syncCalendar(): Promise<WorkspaceData>;
        openMeetingJoinUrl(meetingId: string): Promise<void>;
        openMeetingPanel(meetingId: string): Promise<void>;
        confirmConsent(meetingId: string): Promise<WorkspaceData>;
        dismissMeetingPanel(meetingId: string): Promise<WorkspaceData>;
      };
    };
  }
}

export {};
