import { randomUUID } from "node:crypto";

export type CalendarProvider = "google" | "outlook";

export type RecallCalendarConfig = {
  enabled: boolean;
  apiKey?: string;
  apiBaseUrl: string;
  callbackUrl: string;
  google?: OAuthProviderConfig;
  outlook?: OAuthProviderConfig;
};

export type OAuthProviderConfig = {
  clientId: string;
  clientSecret: string;
  scopes: string[];
};

export type OAuthPendingState = {
  state: string;
  provider: CalendarProvider;
  createdAt: string;
};

export type ProviderTokenResult = {
  refreshToken: string;
  accessToken?: string;
  scope?: string;
  email?: string;
};

export type RecallCalendarRecord = {
  id: string;
  platform?: string;
  email?: string;
  status?: string;
};

export type RecallCalendarEvent = {
  id: string;
  title?: string;
  start_time?: string;
  end_time?: string;
  meeting_url?: string;
  join_url?: string;
  is_deleted?: boolean;
  deleted?: boolean;
  platform?: string;
  calendar_id?: string;
  calendar?: {
    id?: string;
    platform?: string;
    email?: string;
  };
  raw?: {
    candidate_name?: string;
    role_title?: string;
    description?: string;
    meeting_url?: string;
    join_url?: string;
    summary?: string;
    htmlLink?: string;
    organizer?: {
      email?: string;
    };
  };
};

export type TaploMeetingRecord = {
  id: string;
  source: "calendar";
  calendarEventId: string;
  calendarProvider: CalendarProvider;
  joinUrl?: string;
  candidateName: string;
  roleTitle: string;
  jobDescription: string;
  candidateCv: string;
  recruiterNotes: string;
  scheduledAt: string;
  cancelledAt?: string;
  status: "upcoming" | "cancelled";
};

const REGION_HOSTS: Record<string, string> = {
  "us-east-1": "https://us-east-1.recall.ai",
  "us-west-2": "https://us-west-2.recall.ai",
  "eu-central-1": "https://eu-central-1.recall.ai",
  "ap-northeast-1": "https://ap-northeast-1.recall.ai",
};

export function getRecallCalendarConfig(env = process.env): RecallCalendarConfig {
  const region = env.RECALL_REGION || "eu-central-1";
  const apiBaseUrl = env.RECALL_API_BASE_URL || REGION_HOSTS[region] || REGION_HOSTS["eu-central-1"];
  const callbackUrl = env.CALENDAR_OAUTH_CALLBACK_URL || "taplo://calendar/oauth-callback";
  const google = createProviderConfig(env.GOOGLE_CALENDAR_CLIENT_ID, env.GOOGLE_CALENDAR_CLIENT_SECRET, [
    "openid",
    "email",
    "https://www.googleapis.com/auth/calendar.events.readonly",
    "https://www.googleapis.com/auth/calendar.readonly",
  ]);
  const outlook = createProviderConfig(env.MICROSOFT_CALENDAR_CLIENT_ID, env.MICROSOFT_CALENDAR_CLIENT_SECRET, [
    "offline_access",
    "User.Read",
    "Calendars.Read",
  ]);

  return {
    enabled: Boolean(env.RECALL_API_KEY),
    apiKey: env.RECALL_API_KEY,
    apiBaseUrl,
    callbackUrl,
    google,
    outlook,
  };
}

export function providerConfig(config: RecallCalendarConfig, provider: CalendarProvider) {
  return provider === "google" ? config.google : config.outlook;
}

export function hasProviderCredentials(config: RecallCalendarConfig, provider: CalendarProvider) {
  return Boolean(config.enabled && providerConfig(config, provider));
}

export function createOAuthState(provider: CalendarProvider): OAuthPendingState {
  return {
    state: randomUUID(),
    provider,
    createdAt: new Date().toISOString(),
  };
}

export function buildProviderAuthUrl(config: RecallCalendarConfig, provider: CalendarProvider, state: string) {
  const oauth = providerConfig(config, provider);

  if (!oauth) {
    throw new Error(`Missing ${provider} OAuth client credentials.`);
  }

  if (provider === "google") {
    const params = new URLSearchParams({
      client_id: oauth.clientId,
      redirect_uri: config.callbackUrl,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
      scope: oauth.scopes.join(" "),
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  const params = new URLSearchParams({
    client_id: oauth.clientId,
    redirect_uri: config.callbackUrl,
    response_type: "code",
    response_mode: "query",
    state,
    scope: oauth.scopes.join(" "),
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function exchangeProviderCode(
  config: RecallCalendarConfig,
  provider: CalendarProvider,
  code: string,
): Promise<ProviderTokenResult> {
  const oauth = providerConfig(config, provider);

  if (!oauth) {
    throw new Error(`Missing ${provider} OAuth client credentials.`);
  }

  const endpoint =
    provider === "google"
      ? "https://oauth2.googleapis.com/token"
      : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const body = new URLSearchParams({
    client_id: oauth.clientId,
    client_secret: oauth.clientSecret,
    code,
    redirect_uri: config.callbackUrl,
    grant_type: "authorization_code",
  });
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });
  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(String(payload.error_description || payload.error || `${provider} token exchange failed.`));
  }

  const refreshToken = payload.refresh_token;

  if (typeof refreshToken !== "string" || !refreshToken) {
    throw new Error(`${provider} did not return a refresh token. Reconnect with offline access enabled.`);
  }

  return {
    refreshToken,
    accessToken: typeof payload.access_token === "string" ? payload.access_token : undefined,
    scope: typeof payload.scope === "string" ? payload.scope : undefined,
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
}

export function validateProviderScopes(provider: CalendarProvider, scope?: string) {
  if (!scope) {
    return;
  }

  const scopes = scope.split(/\s+/);

  if (provider === "google") {
    const hasCalendarScope = scopes.some((item) =>
      [
        "https://www.googleapis.com/auth/calendar.events.readonly",
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar",
      ].includes(item),
    );

    if (!hasCalendarScope) {
      throw new Error("Google calendar scope was not granted. Reconnect and select the calendar permission checkbox.");
    }
  }
}

export class RecallCalendarV2Client {
  constructor(private readonly config: RecallCalendarConfig) {}

  async listCalendars() {
    const payload = await this.recallRequest<{ results?: RecallCalendarRecord[] }>("/api/v2/calendars/");
    return payload.results ?? [];
  }

  async createCalendar(input: {
    provider: CalendarProvider;
    refreshToken: string;
    oauthClientId: string;
    oauthClientSecret: string;
  }) {
    return this.recallRequest<RecallCalendarRecord>("/api/v2/calendars/", {
      method: "POST",
      body: {
        platform: toRecallPlatform(input.provider),
        oauth_client_id: input.oauthClientId,
        oauth_client_secret: input.oauthClientSecret,
        oauth_refresh_token: input.refreshToken,
      },
    });
  }

  async updateCalendar(
    calendarId: string,
    input: {
      refreshToken: string;
      oauthClientId: string;
      oauthClientSecret: string;
    },
  ) {
    return this.recallRequest<RecallCalendarRecord>(`/api/v2/calendars/${calendarId}/`, {
      method: "PATCH",
      body: {
        oauth_client_id: input.oauthClientId,
        oauth_client_secret: input.oauthClientSecret,
        oauth_refresh_token: input.refreshToken,
      },
    });
  }

  async listCalendarEvents(calendarId: string) {
    const startTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const endTime = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString();
    const params = new URLSearchParams({
      calendar_id: calendarId,
      start_time__gte: startTime,
      start_time__lte: endTime,
    });
    const payload = await this.recallRequest<{ results?: RecallCalendarEvent[] }>(`/api/v2/calendar-events/?${params.toString()}`);
    return payload.results ?? [];
  }

  async upsertCalendar(input: {
    provider: CalendarProvider;
    refreshToken: string;
    oauthClientId: string;
    oauthClientSecret: string;
    existingCalendarId?: string;
  }) {
    if (input.existingCalendarId) {
      return this.updateCalendar(input.existingCalendarId, input);
    }

    const calendars = await this.listCalendars();
    const existing = calendars.find((calendar) => calendar.platform === toRecallPlatform(input.provider));

    if (existing?.id) {
      return this.updateCalendar(existing.id, input);
    }

    return this.createCalendar(input);
  }

  private async recallRequest<T>(pathname: string, init?: { method?: string; body?: Record<string, unknown> }) {
    if (!this.config.apiKey) {
      throw new Error("RECALL_API_KEY is required for Recall Calendar V2.");
    }

    const response = await fetch(`${this.config.apiBaseUrl}${pathname}`, {
      method: init?.method ?? "GET",
      headers: {
        Authorization: `Token ${this.config.apiKey}`,
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
    const text = await response.text();
    const payload = text ? (JSON.parse(text) as T & { detail?: string }) : ({} as T & { detail?: string });

    if (!response.ok) {
      throw new Error(payload.detail || `Recall Calendar V2 request failed with ${response.status}.`);
    }

    return payload as T;
  }
}

export function hasTaploMeetingJoinLink(meeting: Pick<TaploMeetingRecord, "joinUrl">) {
  return Boolean(meeting.joinUrl?.trim());
}

export function parseCalendarEventTitle(title: string) {
  const cleaned = title.replace(/^interview:\s*/i, "").trim();
  const parts = cleaned.split(/\s*-\s*/);

  return {
    candidateName: parts[0]?.trim() || "Unknown candidate",
    roleTitle: parts.slice(1).join(" - ").trim() || "Interview",
  };
}

export function normalizeCalendarEvent(event: RecallCalendarEvent, provider: CalendarProvider): TaploMeetingRecord {
  const title = event.raw?.summary ?? event.title ?? "Candidate interview";
  const parsedTitle = parseCalendarEventTitle(title);
  const cancelled = Boolean(event.is_deleted || event.deleted);

  return {
    id: `recall-calendar-${event.id}`,
    source: "calendar",
    calendarEventId: event.id,
    calendarProvider: provider,
    joinUrl: event.join_url ?? event.meeting_url ?? event.raw?.join_url ?? event.raw?.meeting_url,
    candidateName: event.raw?.candidate_name ?? parsedTitle.candidateName,
    roleTitle: event.raw?.role_title ?? parsedTitle.roleTitle,
    jobDescription: event.raw?.description ?? "",
    candidateCv: "",
    recruiterNotes: "Synced from Recall Calendar V2.",
    scheduledAt: event.start_time ?? new Date().toISOString(),
    cancelledAt: cancelled ? new Date().toISOString() : undefined,
    status: cancelled ? "cancelled" : "upcoming",
  };
}

export function toRecallPlatform(provider: CalendarProvider) {
  return provider === "google" ? "google_calendar" : "microsoft_outlook";
}

function createProviderConfig(clientId?: string, clientSecret?: string, scopes: string[] = []) {
  if (!clientId || !clientSecret) {
    return undefined;
  }

  return {
    clientId,
    clientSecret,
    scopes,
  };
}
