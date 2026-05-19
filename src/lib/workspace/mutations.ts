import { createEmptyWorkspace } from "./default-data";
import { usageEventCost } from "@/lib/usage/costs";
import type {
  AnalysisOutput,
  CalendarConnection,
  CalendarProvider,
  LiveGuidance,
  Meeting,
  Session,
  TranscriptSegment,
  UsageEvent,
  WorkspaceData,
} from "./types";

export function ensureWorkspace(data?: WorkspaceData | null): WorkspaceData {
  const emptyWorkspace = createEmptyWorkspace();

  if (!data || data.schemaVersion !== 1) {
    return emptyWorkspace;
  }

  return {
    ...emptyWorkspace,
    ...data,
    meetingPanelStates: data.meetingPanelStates ?? [],
    settings: {
      ...emptyWorkspace.settings,
      ...data.settings,
    },
  };
}

export function hasMeetingJoinLink(meeting: Pick<Meeting, "joinUrl">) {
  return Boolean(meeting.joinUrl?.trim());
}

export function filterSyncableCalendarMeetings(meetings: Meeting[]) {
  return meetings.filter((meeting) => meeting.source !== "calendar" || hasMeetingJoinLink(meeting));
}

export function addMeetingToWorkspace(workspace: WorkspaceData, meeting: Meeting): WorkspaceData {
  return {
    ...workspace,
    meetings: [meeting, ...workspace.meetings],
  };
}

export type MeetingContextPatch = Partial<
  Pick<Meeting, "candidateName" | "roleTitle" | "jobDescription" | "candidateCv" | "recruiterNotes">
>;

export function updateMeetingInWorkspace(workspace: WorkspaceData, meetingId: string, patch: MeetingContextPatch): WorkspaceData {
  const hasMatch = workspace.meetings.some((meeting) => meeting.id === meetingId);

  if (!hasMatch) {
    return workspace;
  }

  return {
    ...workspace,
    meetings: workspace.meetings.map((meeting) => (meeting.id === meetingId ? { ...meeting, ...patch } : meeting)),
  };
}

export function startSessionInWorkspace(workspace: WorkspaceData, meetingId: string): { workspace: WorkspaceData; session: Session } {
  const session: Session = {
    id: crypto.randomUUID(),
    meetingId,
    startedAt: new Date().toISOString(),
    durationSeconds: 0,
    status: "recording",
    transcriptSegmentIds: [],
    liveGuidance: [],
  };

  return {
    session,
    workspace: {
      ...workspace,
      sessions: [session, ...workspace.sessions],
      meetings: workspace.meetings.map((meeting) =>
        meeting.id === meetingId ? { ...meeting, status: "recorded" } : meeting,
      ),
    },
  };
}

export function stopSessionInWorkspace(
  workspace: WorkspaceData,
  sessionId: string,
  transcriptSegments: TranscriptSegment[],
): { workspace: WorkspaceData; session: Session } {
  const endedAt = new Date();
  const target = workspace.sessions.find((session) => session.id === sessionId);
  const durationSeconds = target ? Math.max(1, Math.round((endedAt.getTime() - new Date(target.startedAt).getTime()) / 1000)) : 0;
  const usageEvent = createUsageEvent("recording", durationSeconds, sessionId);
  let updatedSession: Session | undefined;

  const sessions = workspace.sessions.map((session) => {
    if (session.id !== sessionId) {
      return session;
    }

    updatedSession = {
      ...session,
      endedAt: endedAt.toISOString(),
      durationSeconds,
      status: "stopped",
      transcriptSegmentIds: Array.from(new Set([...session.transcriptSegmentIds, ...transcriptSegments.map((segment) => segment.id)])),
    };
    return updatedSession;
  });

  if (!updatedSession) {
    throw new Error("Session not found.");
  }

  return {
    session: updatedSession,
    workspace: {
      ...workspace,
      sessions,
      transcriptSegments: [...workspace.transcriptSegments, ...transcriptSegments],
      usageEvents: [...workspace.usageEvents, usageEvent],
    },
  };
}

export function pauseSessionInWorkspace(workspace: WorkspaceData, sessionId: string): { workspace: WorkspaceData; session: Session } {
  let updatedSession: Session | undefined;

  const sessions = workspace.sessions.map((session) => {
    if (session.id !== sessionId || session.status !== "recording") {
      return session;
    }

    updatedSession = {
      ...session,
      status: "paused",
      pausedAt: new Date().toISOString(),
    };
    return updatedSession;
  });

  if (!updatedSession) {
    throw new Error("Recording session not found.");
  }

  return {
    session: updatedSession,
    workspace: {
      ...workspace,
      sessions,
    },
  };
}

export function resumeSessionInWorkspace(workspace: WorkspaceData, sessionId: string): { workspace: WorkspaceData; session: Session } {
  let updatedSession: Session | undefined;

  const sessions = workspace.sessions.map((session) => {
    if (session.id !== sessionId || session.status !== "paused") {
      return session;
    }

    updatedSession = {
      ...session,
      status: "recording",
      pausedAt: undefined,
    };
    return updatedSession;
  });

  if (!updatedSession) {
    throw new Error("Paused session not found.");
  }

  return {
    session: updatedSession,
    workspace: {
      ...workspace,
      sessions,
    },
  };
}

export function addGuidanceToWorkspace(
  workspace: WorkspaceData,
  sessionId: string,
  guidance: LiveGuidance,
): WorkspaceData {
  const usageEvent = createUsageEvent("live_ai", 1, sessionId);

  return {
    ...workspace,
    sessions: workspace.sessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            liveGuidance: [guidance, ...session.liveGuidance],
          }
        : session,
    ),
    usageEvents: [...workspace.usageEvents, usageEvent],
  };
}

export function addAnalysisToWorkspace(
  workspace: WorkspaceData,
  sessionId: string,
  analysis: AnalysisOutput,
): WorkspaceData {
  const targetSession = workspace.sessions.find((session) => session.id === sessionId);
  const usageEvent = createUsageEvent("final_ai", 1, sessionId);

  return {
    ...workspace,
    analyses: [analysis, ...workspace.analyses.filter((item) => item.sessionId !== sessionId)],
    sessions: workspace.sessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            status: "analyzed",
            analysisId: analysis.id,
          }
        : session,
    ),
    meetings: targetSession
      ? workspace.meetings.map((meeting) =>
          meeting.id === targetSession.meetingId ? { ...meeting, status: "analyzed" } : meeting,
        )
      : workspace.meetings,
    usageEvents: [...workspace.usageEvents, usageEvent],
  };
}

export function connectCalendarInWorkspace(workspace: WorkspaceData, provider: CalendarProvider): WorkspaceData {
  const connection: CalendarConnection = {
    id: crypto.randomUUID(),
    provider,
    email: provider === "google" ? "recruiter@gmail.com" : "recruiter@outlook.com",
    status: "connected",
    connectedAt: new Date().toISOString(),
  };

  return {
    ...workspace,
    calendarConnections: [connection, ...workspace.calendarConnections.filter((item) => item.provider !== provider)],
  };
}

export function confirmConsentInWorkspace(workspace: WorkspaceData, meetingId: string, confirmedBy = "Recruiter"): WorkspaceData {
  const confirmedAt = new Date().toISOString();

  return {
    ...workspace,
    meetings: workspace.meetings.map((meeting) =>
      meeting.id === meetingId
        ? {
            ...meeting,
            consentConfirmedAt: confirmedAt,
            consentConfirmedBy: confirmedBy,
          }
        : meeting,
    ),
  };
}

export function dismissMeetingPanelInWorkspace(workspace: WorkspaceData, meetingId: string): WorkspaceData {
  const dismissedAt = new Date().toISOString();

  return {
    ...workspace,
    meetings: workspace.meetings.map((meeting) =>
      meeting.id === meetingId
        ? {
            ...meeting,
            panelDismissedAt: dismissedAt,
          }
        : meeting,
    ),
    meetingPanelStates: [
      {
        meetingId,
        status: "dismissed",
        dismissedAt,
      },
      ...workspace.meetingPanelStates.filter((state) => state.meetingId !== meetingId),
    ],
  };
}

export function disconnectCalendarInWorkspace(workspace: WorkspaceData, connectionId: string): WorkspaceData {
  return {
    ...workspace,
    calendarConnections: workspace.calendarConnections.map((connection) =>
      connection.id === connectionId ? { ...connection, status: "disconnected" } : connection,
    ),
  };
}

export function syncCalendarInWorkspace(workspace: WorkspaceData, meetings: Meeting[]): WorkspaceData {
  const usageEvent = createUsageEvent("calendar_sync", 1);
  const linkableMeetings = filterSyncableCalendarMeetings(meetings);
  const syncedKeys = new Set(linkableMeetings.map((meeting) => meeting.calendarEventId ?? meeting.id));
  const mergedMeetings = [...workspace.meetings];

  linkableMeetings.forEach((syncedMeeting) => {
    const index = mergedMeetings.findIndex(
      (meeting) =>
        (syncedMeeting.calendarEventId && meeting.calendarEventId === syncedMeeting.calendarEventId) ||
        meeting.id === syncedMeeting.id,
    );

    if (index === -1) {
      mergedMeetings.unshift(syncedMeeting);
      return;
    }

    const existing = mergedMeetings[index];
    mergedMeetings[index] = {
      ...syncedMeeting,
      candidateCv: existing.candidateCv || syncedMeeting.candidateCv,
      jobDescription: existing.jobDescription || syncedMeeting.jobDescription,
      recruiterNotes: existing.recruiterNotes || syncedMeeting.recruiterNotes,
      consentConfirmedAt: existing.consentConfirmedAt,
      consentConfirmedBy: existing.consentConfirmedBy,
      startsAtReminderShown: existing.startsAtReminderShown,
      panelDismissedAt: existing.panelDismissedAt,
      status: existing.status === "recorded" || existing.status === "analyzed" ? existing.status : syncedMeeting.status,
    };
  });

  return {
    ...workspace,
    meetings: mergedMeetings.map((meeting) =>
      meeting.source === "calendar" && meeting.status === "upcoming" && !syncedKeys.has(meeting.calendarEventId ?? meeting.id)
        ? {
            ...meeting,
            status: "cancelled",
            cancelledAt: new Date().toISOString(),
          }
        : meeting,
    ),
    calendarConnections: workspace.calendarConnections.map((connection) =>
      connection.status === "connected"
        ? { ...connection, lastSyncedAt: new Date().toISOString(), syncStatus: "success", syncError: undefined }
        : connection,
    ),
    usageEvents: [...workspace.usageEvents, usageEvent],
  };
}

function createUsageEvent(kind: UsageEvent["kind"], quantity: number, sessionId?: string): UsageEvent {
  return {
    id: crypto.randomUUID(),
    sessionId,
    createdAt: new Date().toISOString(),
    kind,
    quantity,
    unit: kind === "recording" ? "second" : "request",
    estimatedCostUsd: usageEventCost(kind, quantity),
  };
}
