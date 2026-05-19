import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("taplo", {
  workspace: {
    load: () => ipcRenderer.invoke("workspace:load"),
    save: (data: unknown) => ipcRenderer.invoke("workspace:save", data),
    addMeeting: (meeting: unknown) => ipcRenderer.invoke("workspace:addMeeting", meeting),
    updateMeeting: (meetingId: string, patch: unknown) => ipcRenderer.invoke("workspace:updateMeeting", meetingId, patch),
    startRecording: (meetingId: string) => ipcRenderer.invoke("recording:start", meetingId),
    pauseRecording: (sessionId: string) => ipcRenderer.invoke("recording:pause", sessionId),
    resumeRecording: (sessionId: string) => ipcRenderer.invoke("recording:resume", sessionId),
    stopRecording: (sessionId: string) => ipcRenderer.invoke("recording:stop", sessionId),
    requestLiveGuidance: (sessionId: string) => ipcRenderer.invoke("ai:liveGuidance", sessionId),
    analyzeSession: (sessionId: string) => ipcRenderer.invoke("ai:analyze", sessionId),
    connectCalendar: (provider: string) => ipcRenderer.invoke("calendar:connect", provider),
    disconnectCalendar: (connectionId: string) => ipcRenderer.invoke("calendar:disconnect", connectionId),
    syncCalendar: () => ipcRenderer.invoke("calendar:sync"),
    openMeetingJoinUrl: (meetingId: string) => ipcRenderer.invoke("panel:openJoinUrl", meetingId),
    openMeetingPanel: (meetingId: string) => ipcRenderer.invoke("panel:open", meetingId),
    confirmConsent: (meetingId: string) => ipcRenderer.invoke("panel:confirmConsent", meetingId),
    dismissMeetingPanel: (meetingId: string) => ipcRenderer.invoke("panel:dismiss", meetingId),
  },
});
