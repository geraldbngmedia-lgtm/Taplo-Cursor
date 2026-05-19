import type { WorkspaceData } from "./types";

export function createEmptyWorkspace(): WorkspaceData {
  return {
    schemaVersion: 1,
    meetings: [],
    sessions: [],
    transcriptSegments: [],
    analyses: [],
    usageEvents: [],
    calendarConnections: [],
    meetingPanelStates: [],
    settings: {
      openAiModel: "gpt-4.1-mini",
      liveGuidanceIntervalSeconds: 25,
    },
  };
}

export function createSeedWorkspace(): WorkspaceData {
  const workspace = createEmptyWorkspace();
  const meetingId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const segmentId = crypto.randomUUID();

  workspace.meetings.push({
    id: meetingId,
    source: "manual",
    candidateName: "Maya Johnson",
    roleTitle: "Senior Frontend Engineer",
    jobDescription: "React, TypeScript, design systems, and stakeholder communication.",
    candidateCv: "8 years in product engineering with recent work on accessibility-focused UI platforms.",
    recruiterNotes: "Probe leadership scope and ability to mentor.",
    scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    joinUrl: "https://meet.google.com/taplo-demo",
    status: "upcoming",
  });

  workspace.sessions.push({
    id: sessionId,
    meetingId,
    startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    endedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    durationSeconds: 1500,
    status: "stopped",
    transcriptSegmentIds: [segmentId],
    liveGuidance: [],
  });

  workspace.transcriptSegments.push({
    id: segmentId,
    sessionId,
    speaker: "Candidate",
    text: "I led a design system migration across four product squads and paired with engineering managers on rollout risk.",
    startMs: 0,
    endMs: 6000,
    final: true,
  });

  return workspace;
}
