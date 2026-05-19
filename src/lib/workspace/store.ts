import type {
  AnalysisOutput,
  CalendarProvider,
  LiveGuidance,
  Meeting,
  Session,
  TranscriptSegment,
  WorkspaceData,
} from "./types";

export type StartRecordingInput = {
  meetingId: string;
};

export type StopRecordingInput = {
  sessionId: string;
};

export type RecordingSessionInput = {
  sessionId: string;
};

export type AnalyzeSessionInput = {
  sessionId: string;
};

export type CalendarConnectInput = {
  provider: CalendarProvider;
};

export type UpdateMeetingInput = {
  meetingId: string;
  patch: Partial<Pick<Meeting, "candidateName" | "roleTitle" | "jobDescription" | "candidateCv" | "recruiterNotes">>;
};

export type WorkspaceStore = {
  load(): Promise<WorkspaceData>;
  save(data: WorkspaceData): Promise<WorkspaceData>;
  addMeeting(meeting: Meeting): Promise<WorkspaceData>;
  updateMeeting(input: UpdateMeetingInput): Promise<WorkspaceData>;
  startRecording(input: StartRecordingInput): Promise<{ workspace: WorkspaceData; session: Session }>;
  pauseRecording(input: RecordingSessionInput): Promise<{ workspace: WorkspaceData; session: Session }>;
  resumeRecording(input: RecordingSessionInput): Promise<{ workspace: WorkspaceData; session: Session }>;
  stopRecording(input: StopRecordingInput): Promise<{
    workspace: WorkspaceData;
    session: Session;
    transcriptSegments: TranscriptSegment[];
  }>;
  requestLiveGuidance(sessionId: string): Promise<{ workspace: WorkspaceData; guidance: LiveGuidance }>;
  analyzeSession(input: AnalyzeSessionInput): Promise<{ workspace: WorkspaceData; analysis: AnalysisOutput }>;
  connectCalendar(input: CalendarConnectInput): Promise<WorkspaceData>;
  disconnectCalendar(connectionId: string): Promise<WorkspaceData>;
  syncCalendar(): Promise<WorkspaceData>;
  openMeetingJoinUrl(meetingId: string): Promise<void>;
  openMeetingPanel(meetingId: string): Promise<void>;
  confirmConsent(meetingId: string): Promise<WorkspaceData>;
  dismissMeetingPanel(meetingId: string): Promise<WorkspaceData>;
};
