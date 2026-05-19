import type { UsageEvent, UsageSummary, WorkspaceData } from "@/lib/workspace/types";

export const COST_RATES = {
  recordingPerHourUsd: 0.18,
  liveGuidanceRequestUsd: 0.004,
  finalAnalysisRequestUsd: 0.035,
  calendarSyncRequestUsd: 0.001,
} as const;

export function recordingCost(durationSeconds: number) {
  return (durationSeconds / 3600) * COST_RATES.recordingPerHourUsd;
}

export function usageEventCost(kind: UsageEvent["kind"], quantity: number) {
  if (kind === "recording") {
    return recordingCost(quantity);
  }

  if (kind === "live_ai") {
    return quantity * COST_RATES.liveGuidanceRequestUsd;
  }

  if (kind === "final_ai") {
    return quantity * COST_RATES.finalAnalysisRequestUsd;
  }

  return quantity * COST_RATES.calendarSyncRequestUsd;
}

export function summarizeUsage(workspace: WorkspaceData): UsageSummary {
  const totalSeconds = workspace.sessions.reduce((sum, session) => sum + session.durationSeconds, 0);

  const recordingCostUsd = workspace.usageEvents
    .filter((event) => event.kind === "recording")
    .reduce((sum, event) => sum + event.estimatedCostUsd, 0);
  const aiCostUsd = workspace.usageEvents
    .filter((event) => event.kind === "live_ai" || event.kind === "final_ai")
    .reduce((sum, event) => sum + event.estimatedCostUsd, 0);
  const calendarCostUsd = workspace.usageEvents
    .filter((event) => event.kind === "calendar_sync")
    .reduce((sum, event) => sum + event.estimatedCostUsd, 0);

  return {
    totalSessions: workspace.sessions.length,
    totalHoursRecorded: totalSeconds / 3600,
    recordingCostUsd,
    aiCostUsd,
    calendarCostUsd,
    totalCostUsd: recordingCostUsd + aiCostUsd + calendarCostUsd,
  };
}
