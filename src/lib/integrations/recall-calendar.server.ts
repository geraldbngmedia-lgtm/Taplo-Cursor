import type { CalendarProvider, Meeting } from "@/lib/workspace/types";

type RecallCalendarEvent = {
  id: string;
  title?: string;
  start_time?: string;
  meeting_url?: string;
  join_url?: string;
  platform?: string;
  is_deleted?: boolean;
  deleted?: boolean;
  raw?: {
    candidate_name?: string;
    role_title?: string;
    description?: string;
    meeting_url?: string;
    join_url?: string;
  };
};

type RecallCalendarRecord = {
  id: string;
  platform?: string;
  email?: string;
  status?: string;
};

const REGION_HOSTS: Record<string, string> = {
  "us-east-1": "https://us-east-1.recall.ai",
  "us-west-2": "https://us-west-2.recall.ai",
  "eu-central-1": "https://eu-central-1.recall.ai",
  "ap-northeast-1": "https://ap-northeast-1.recall.ai",
};

export function createRecallCalendarApiClient(
  apiKey = process.env.RECALL_API_KEY,
  apiBaseUrl = process.env.RECALL_API_BASE_URL || REGION_HOSTS[process.env.RECALL_REGION || "eu-central-1"],
) {
  if (!apiKey) {
    throw new Error("RECALL_API_KEY is required for Recall Calendar API calls.");
  }

  async function recallRequest<T>(pathname: string, init?: { method?: string; body?: Record<string, unknown> }) {
    const response = await fetch(`${apiBaseUrl}${pathname}`, {
      method: init?.method ?? "GET",
      headers: {
        Authorization: `Token ${apiKey}`,
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
    const text = await response.text();
    const payload = text ? (JSON.parse(text) as T & { detail?: string }) : ({} as T & { detail?: string });

    if (!response.ok) {
      throw new Error(payload.detail || `Recall Calendar request failed with ${response.status}.`);
    }

    return payload as T;
  }

  return {
    async listCalendars() {
      const payload = await recallRequest<{ results?: RecallCalendarRecord[] }>("/api/v2/calendars/");
      return payload.results ?? [];
    },
    async createCalendar(input: {
      provider: CalendarProvider;
      refreshToken: string;
      oauthClientId: string;
      oauthClientSecret: string;
    }) {
      return recallRequest<RecallCalendarRecord>("/api/v2/calendars/", {
        method: "POST",
        body: {
          platform: toRecallPlatform(input.provider),
          oauth_client_id: input.oauthClientId,
          oauth_client_secret: input.oauthClientSecret,
          oauth_refresh_token: input.refreshToken,
        },
      });
    },
    async updateCalendar(
      calendarId: string,
      input: {
        refreshToken: string;
        oauthClientId: string;
        oauthClientSecret: string;
      },
    ) {
      return recallRequest<RecallCalendarRecord>(`/api/v2/calendars/${calendarId}/`, {
        method: "PATCH",
        body: {
          oauth_client_id: input.oauthClientId,
          oauth_client_secret: input.oauthClientSecret,
          oauth_refresh_token: input.refreshToken,
        },
      });
    },
    async listCalendarEvents(calendarId: string, provider: CalendarProvider): Promise<Meeting[]> {
      const params = new URLSearchParams({
        calendar_id: calendarId,
        start_time__gte: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        start_time__lte: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const payload = await recallRequest<{ results?: RecallCalendarEvent[] }>(`/api/v2/calendar-events/?${params.toString()}`);
      return (payload.results ?? [])
        .map((event) => normalizeCalendarEvent(event, provider))
        .filter((meeting) => Boolean(meeting.joinUrl?.trim()));
    },
  };
}

function normalizeCalendarEvent(event: RecallCalendarEvent, provider: CalendarProvider): Meeting {
  const titleParts = (event.title ?? "Candidate interview").split("-");
  const cancelled = Boolean(event.is_deleted || event.deleted);

  return {
    id: `recall-calendar-${event.id}`,
    source: "calendar",
    calendarEventId: event.id,
    calendarProvider: provider,
    joinUrl: event.join_url ?? event.meeting_url ?? event.raw?.join_url ?? event.raw?.meeting_url,
    candidateName: event.raw?.candidate_name ?? titleParts[0]?.trim() ?? "Unknown candidate",
    roleTitle: event.raw?.role_title ?? titleParts[1]?.trim() ?? "Interview",
    jobDescription: event.raw?.description ?? "",
    candidateCv: "",
    recruiterNotes: "Synced from Recall Calendar API.",
    scheduledAt: event.start_time ?? new Date().toISOString(),
    cancelledAt: cancelled ? new Date().toISOString() : undefined,
    status: cancelled ? "cancelled" : "upcoming",
  };
}

function toRecallPlatform(provider: CalendarProvider) {
  return provider === "google" ? "google_calendar" : "microsoft_outlook";
}
