"use client";

import { createMockCalendarMeetings, getRecallCalendarAuthUrl } from "@/lib/integrations/recall-calendar";
import { createMockOpenAiAnalysisClient } from "@/lib/integrations/openai-analysis";
import { createMockRecallDesktopClient } from "@/lib/integrations/recall-desktop";
import {
  addAnalysisToWorkspace,
  addGuidanceToWorkspace,
  addMeetingToWorkspace,
  updateMeetingInWorkspace,
  confirmConsentInWorkspace,
  connectCalendarInWorkspace,
  disconnectCalendarInWorkspace,
  dismissMeetingPanelInWorkspace,
  ensureWorkspace,
  pauseSessionInWorkspace,
  resumeSessionInWorkspace,
  startSessionInWorkspace,
  stopSessionInWorkspace,
  syncCalendarInWorkspace,
} from "./mutations";
import type { CalendarConnectInput, WorkspaceStore } from "./store";
import type { Meeting, WorkspaceData } from "./types";

const STORAGE_KEY = "taplo.workspace.v1";

export function createLocalStorageWorkspaceStore(): WorkspaceStore {
  const recall = createMockRecallDesktopClient();
  const ai = createMockOpenAiAnalysisClient();

  async function load() {
    if (typeof window === "undefined") {
      return ensureWorkspace();
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    return ensureWorkspace(raw ? (JSON.parse(raw) as WorkspaceData) : null);
  }

  async function save(data: WorkspaceData) {
    const workspace = ensureWorkspace(data);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    return workspace;
  }

  return {
    load,
    save,
    async addMeeting(meeting: Meeting) {
      return save(addMeetingToWorkspace(await load(), meeting));
    },
    async updateMeeting({ meetingId, patch }) {
      return save(updateMeetingInWorkspace(await load(), meetingId, patch));
    },
    async startRecording({ meetingId }) {
      const result = startSessionInWorkspace(await load(), meetingId);
      await recall.startRecording(result.session.id);
      return {
        ...result,
        workspace: await save(result.workspace),
      };
    },
    async pauseRecording({ sessionId }) {
      const result = pauseSessionInWorkspace(await load(), sessionId);
      return {
        ...result,
        workspace: await save(result.workspace),
      };
    },
    async resumeRecording({ sessionId }) {
      const result = resumeSessionInWorkspace(await load(), sessionId);
      return {
        ...result,
        workspace: await save(result.workspace),
      };
    },
    async stopRecording({ sessionId }) {
      const transcriptSegments = await recall.stopRecording(sessionId);
      const result = stopSessionInWorkspace(await load(), sessionId, transcriptSegments);

      return {
        ...result,
        transcriptSegments,
        workspace: await save(result.workspace),
      };
    },
    async requestLiveGuidance(sessionId) {
      const workspace = await load();
      const session = workspace.sessions.find((item) => item.id === sessionId);
      const meeting = workspace.meetings.find((item) => item.id === session?.meetingId);
      const transcriptSegments = workspace.transcriptSegments.filter((segment) => segment.sessionId === sessionId);
      const guidance = await ai.liveGuidance({ sessionId, meeting, transcriptSegments });
      const nextWorkspace = addGuidanceToWorkspace(workspace, sessionId, guidance);

      return {
        guidance,
        workspace: await save(nextWorkspace),
      };
    },
    async analyzeSession({ sessionId }) {
      const workspace = await load();
      const session = workspace.sessions.find((item) => item.id === sessionId);
      const meeting = workspace.meetings.find((item) => item.id === session?.meetingId);
      const transcriptSegments = workspace.transcriptSegments.filter((segment) => segment.sessionId === sessionId);
      const analysis = await ai.analyze({ sessionId, meeting, transcriptSegments });
      const nextWorkspace = addAnalysisToWorkspace(workspace, sessionId, analysis);

      return {
        analysis,
        workspace: await save(nextWorkspace),
      };
    },
    async connectCalendar({ provider }: CalendarConnectInput) {
      window.open(getRecallCalendarAuthUrl(provider), "_blank", "noopener,noreferrer");
      return save(connectCalendarInWorkspace(await load(), provider));
    },
    async disconnectCalendar(connectionId) {
      return save(disconnectCalendarInWorkspace(await load(), connectionId));
    },
    async syncCalendar() {
      return save(syncCalendarInWorkspace(await load(), createMockCalendarMeetings()));
    },
    async openMeetingJoinUrl(meetingId) {
      const workspace = await load();
      const meeting = workspace.meetings.find((item) => item.id === meetingId);

      if (meeting?.joinUrl) {
        window.open(meeting.joinUrl, "_blank", "noopener,noreferrer");
      }
    },
    async openMeetingPanel(meetingId) {
      window.open(`/panel?meetingId=${encodeURIComponent(meetingId)}`, "_blank", "noopener,noreferrer");
    },
    async confirmConsent(meetingId) {
      return save(confirmConsentInWorkspace(await load(), meetingId));
    },
    async dismissMeetingPanel(meetingId) {
      return save(dismissMeetingPanelInWorkspace(await load(), meetingId));
    },
  };
}
