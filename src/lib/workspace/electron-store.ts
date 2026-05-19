"use client";

import { createLocalStorageWorkspaceStore } from "./local-storage-store";
import type { CalendarConnectInput, WorkspaceStore } from "./store";
import type { Meeting, WorkspaceData } from "./types";

export function createWorkspaceStore(): WorkspaceStore {
  if (typeof window !== "undefined" && window.taplo?.workspace) {
    const desktop = window.taplo.workspace;

    return {
      load: desktop.load,
      save: (data: WorkspaceData) => desktop.save(data),
      addMeeting: (meeting: Meeting) => desktop.addMeeting(meeting),
      updateMeeting: ({ meetingId, patch }) => desktop.updateMeeting(meetingId, patch),
      startRecording: ({ meetingId }) => desktop.startRecording(meetingId),
      pauseRecording: ({ sessionId }) => desktop.pauseRecording(sessionId),
      resumeRecording: ({ sessionId }) => desktop.resumeRecording(sessionId),
      stopRecording: ({ sessionId }) => desktop.stopRecording(sessionId),
      requestLiveGuidance: (sessionId) => desktop.requestLiveGuidance(sessionId),
      analyzeSession: ({ sessionId }) => desktop.analyzeSession(sessionId),
      connectCalendar: ({ provider }: CalendarConnectInput) => desktop.connectCalendar(provider),
      disconnectCalendar: (connectionId) => desktop.disconnectCalendar(connectionId),
      syncCalendar: () => desktop.syncCalendar(),
      openMeetingJoinUrl: (meetingId) => desktop.openMeetingJoinUrl(meetingId),
      openMeetingPanel: (meetingId) => desktop.openMeetingPanel(meetingId),
      confirmConsent: (meetingId) => desktop.confirmConsent(meetingId),
      dismissMeetingPanel: (meetingId) => desktop.dismissMeetingPanel(meetingId),
    };
  }

  return createLocalStorageWorkspaceStore();
}
