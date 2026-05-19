export type CalendarProvider = "google" | "outlook";
export type MeetingSource = "manual" | "calendar";
export type MeetingStatus = "upcoming" | "recorded" | "analyzed" | "cancelled";
export type SessionStatus = "recording" | "paused" | "stopped" | "analyzed";
export type MeetingPanelStatus = "pending" | "open" | "dismissed" | "completed";

export type CalendarConnection = {
  id: string;
  provider: CalendarProvider;
  email: string;
  recallCalendarId?: string;
  status: "connecting" | "connected" | "disconnected" | "error";
  connectedAt: string;
  lastSyncedAt?: string;
  syncStatus?: "idle" | "syncing" | "success" | "error" | "mock";
  syncError?: string;
};

export type Meeting = {
  id: string;
  source: MeetingSource;
  calendarEventId?: string;
  calendarProvider?: CalendarProvider;
  joinUrl?: string;
  candidateName: string;
  roleTitle: string;
  jobDescription: string;
  candidateCv: string;
  recruiterNotes: string;
  scheduledAt: string;
  startsAtReminderShown?: string;
  panelDismissedAt?: string;
  consentConfirmedAt?: string;
  consentConfirmedBy?: string;
  cancelledAt?: string;
  status: MeetingStatus;
};

export type TranscriptSegment = {
  id: string;
  sessionId: string;
  speaker: "Interviewer" | "Candidate" | "System";
  text: string;
  startMs: number;
  endMs: number;
  final: boolean;
};

export type LiveGuidance = {
  id: string;
  sessionId: string;
  createdAt: string;
  coveredTopics: string[];
  gaps: string[];
  suggestedFollowUps: string[];
};

export type EvidenceItem = {
  label: string;
  evidence: string;
};

export type AnalysisOutput = {
  id: string;
  sessionId: string;
  createdAt: string;
  candidateSummary: string;
  experienceSignals: EvidenceItem[];
  technicalSignals: EvidenceItem[];
  communicationObservations: string[];
  concernsAndMissingInfo: string[];
  clientSubmissionDraft: string;
  followUpEmailDraft: string;
  internalRecruiterNotes: string;
};

export type Session = {
  id: string;
  meetingId: string;
  startedAt: string;
  endedAt?: string;
  pausedAt?: string;
  durationSeconds: number;
  status: SessionStatus;
  transcriptSegmentIds: string[];
  liveGuidance: LiveGuidance[];
  analysisId?: string;
  recordingMode?: "recall" | "mock";
  externalRecordingId?: string;
  recallUploadId?: string;
  recallWindowId?: string;
  recallApiBaseUrl?: string;
  recordingError?: string;
  analysisError?: string;
  transcriptFetchStatus?: "fetching" | "ready" | "failed";
  transcriptFetchError?: string;
};

export type MeetingPanelState = {
  meetingId: string;
  sessionId?: string;
  status: MeetingPanelStatus;
  openedAt?: string;
  dismissedAt?: string;
  completedAt?: string;
};

export type UsageEvent = {
  id: string;
  sessionId?: string;
  createdAt: string;
  kind: "recording" | "live_ai" | "final_ai" | "calendar_sync";
  quantity: number;
  unit: "second" | "token" | "request";
  estimatedCostUsd: number;
};

export type UsageSummary = {
  totalSessions: number;
  totalHoursRecorded: number;
  recordingCostUsd: number;
  aiCostUsd: number;
  calendarCostUsd: number;
  totalCostUsd: number;
};

export type WorkspaceSettings = {
  openAiModel: "gpt-4.1-mini";
  liveGuidanceIntervalSeconds: number;
};

export type WorkspaceData = {
  schemaVersion: 1;
  meetings: Meeting[];
  sessions: Session[];
  transcriptSegments: TranscriptSegment[];
  analyses: AnalysisOutput[];
  usageEvents: UsageEvent[];
  calendarConnections: CalendarConnection[];
  meetingPanelStates: MeetingPanelState[];
  settings: WorkspaceSettings;
};
