import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRecallTranscriptService } from "./recall-transcript";

type CalendarProvider = "google" | "outlook";

type CalendarConnection = {
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

type Meeting = {
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

type ServerState = {
  pendingOAuthStates: Array<{
    state: string;
    provider: CalendarProvider;
    createdAt: string;
  }>;
  calendarConnections: CalendarConnection[];
};

type OAuthConfig = {
  clientId: string;
  clientSecret: string;
  scopes: string[];
};

type AppConfig = {
  port: number;
  publicUrl: string;
  callbackUrl: string;
  recallApiKey?: string;
  recallApiBaseUrl: string;
  anthropicApiKey?: string;
  anthropicModel: string;
  google?: OAuthConfig;
  outlook?: OAuthConfig;
};

type TranscriptSegment = {
  speaker?: string;
  text?: string;
};

type AnalysisOutput = {
  candidateSummary: string;
  experienceSignals: Array<{ label: string; evidence: string }>;
  technicalSignals: Array<{ label: string; evidence: string }>;
  communicationObservations: string[];
  concernsAndMissingInfo: string[];
  clientSubmissionDraft: string;
  followUpEmailDraft: string;
  internalRecruiterNotes: string;
};

type RecallCalendarRecord = {
  id: string;
  platform?: string;
  email?: string;
  status?: string;
};

type RecallCalendarEvent = {
  id: string;
  title?: string;
  start_time?: string;
  meeting_url?: string;
  join_url?: string;
  is_deleted?: boolean;
  deleted?: boolean;
  raw?: {
    candidate_name?: string;
    role_title?: string;
    description?: string;
    meeting_url?: string;
    join_url?: string;
    summary?: string;
  };
};

type RecallDesktopSdkUpload = {
  id: string;
  status?: unknown;
  recording_id?: string | null;
  upload_token: string;
  created_at?: string;
};

const REGION_HOSTS: Record<string, string> = {
  "us-east-1": "https://us-east-1.recall.ai",
  "us-west-2": "https://us-west-2.recall.ai",
  "eu-central-1": "https://eu-central-1.recall.ai",
  "ap-northeast-1": "https://ap-northeast-1.recall.ai",
};

const statePath = path.join(process.cwd(), "backend", "data", "calendar-state.json");
const config = getConfig();
const recallTranscript = createRecallTranscriptService(recallRequest);

const server = createServer((request, response) => {
  void route(request, response).catch((error) => {
    console.error(error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Unexpected server error.",
    });
  });
});

server.listen(config.port, () => {
  console.log(`Taplo backend listening on ${config.publicUrl}`);
});

async function route(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? "/", config.publicUrl);

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/calendar/connect/")) {
    const provider = url.pathname.split("/").at(-1);

    if (!isProvider(provider)) {
      sendJson(response, 400, { error: "Unsupported calendar provider." });
      return;
    }

    const authUrl = await beginOAuth(provider);
    redirect(response, authUrl);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/calendar/oauth/callback") {
    await handleOAuthCallback(url, response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/calendar/sync") {
    const result = await syncCalendarEvents();
    sendJson(response, 200, result);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/calendar/connections") {
    sendJson(response, 200, { connections: loadState().calendarConnections });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/ai/live-guidance") {
    const result = await generateLiveGuidance(await readJsonBody(request));
    sendJson(response, 200, result);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/ai/analyze-session") {
    const result = await generateAnalysis(await readJsonBody(request));
    sendJson(response, 200, result);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/recall/desktop-upload") {
    const result = await createDesktopSdkUpload(await readJsonBody(request));
    sendJson(response, 201, result);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/recall/fetch-session-transcript") {
    const body = await readJsonBody(request);
    const recallUploadId = stringValue(isRecord(body) ? body.recallUploadId : undefined);
    const recordingId = stringValue(isRecord(body) ? body.recordingId : undefined);

    if (!recallUploadId) {
      sendJson(response, 400, { error: "recallUploadId is required." });
      return;
    }

    try {
      const result = await recallTranscript.fetchSessionTranscript({
        recallUploadId,
        recordingId: recordingId || undefined,
      });
      sendJson(response, 200, result);
    } catch (error) {
      sendJson(response, 502, {
        error: error instanceof Error ? error.message : "Recall transcript fetch failed.",
      });
    }
    return;
  }

  sendJson(response, 404, { error: "Not found." });
}

async function beginOAuth(provider: CalendarProvider) {
  ensureProviderReady(provider);
  const state = randomUUID();
  const serverState = loadState();

  serverState.pendingOAuthStates = [
    { state, provider, createdAt: new Date().toISOString() },
    ...serverState.pendingOAuthStates.filter((item) => Date.now() - new Date(item.createdAt).getTime() < 10 * 60 * 1000),
  ];
  serverState.calendarConnections = upsertConnection(serverState.calendarConnections, {
    id: randomUUID(),
    provider,
    email: `${provider} calendar`,
    status: "connecting",
    connectedAt: new Date().toISOString(),
    syncStatus: "idle",
  });
  saveState(serverState);

  return buildProviderAuthUrl(provider, state);
}

async function handleOAuthCallback(url: URL, response: ServerResponse) {
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const serverState = loadState();
  const pending = serverState.pendingOAuthStates.find((item) => item.state === state);

  if (!pending) {
    sendHtml(response, 400, "Taplo calendar connection failed", "This OAuth request expired or was not started by Taplo.");
    return;
  }

  serverState.pendingOAuthStates = serverState.pendingOAuthStates.filter((item) => item.state !== state);

  if (error || !code) {
    serverState.calendarConnections = upsertConnection(serverState.calendarConnections, {
      ...connectionForProvider(serverState, pending.provider),
      status: "error",
      syncStatus: "error",
      syncError: error || "Provider did not return an authorization code.",
    });
    saveState(serverState);
    sendHtml(response, 400, "Taplo calendar connection failed", error || "Provider did not return an authorization code.");
    return;
  }

  try {
    const oauth = providerConfig(pending.provider);
    const token = await exchangeProviderCode(pending.provider, code);
    validateProviderScopes(pending.provider, token.scope);
    const existing = connectionForProvider(serverState, pending.provider);
    const calendar = await upsertRecallCalendar({
      provider: pending.provider,
      refreshToken: token.refreshToken,
      oauthClientId: oauth.clientId,
      oauthClientSecret: oauth.clientSecret,
      existingCalendarId: existing.recallCalendarId,
    });

    serverState.calendarConnections = upsertConnection(serverState.calendarConnections, {
      id: existing.id || randomUUID(),
      provider: pending.provider,
      email: calendar.email || token.email || `${pending.provider} calendar`,
      recallCalendarId: calendar.id,
      status: "connected",
      connectedAt: existing.connectedAt || new Date().toISOString(),
      syncStatus: "idle",
    });
    saveState(serverState);
    sendHtml(response, 200, "Calendar connected", "You can return to Taplo and click Sync meetings.");
  } catch (callbackError) {
    serverState.calendarConnections = upsertConnection(serverState.calendarConnections, {
      ...connectionForProvider(serverState, pending.provider),
      provider: pending.provider,
      status: "error",
      syncStatus: "error",
      syncError: callbackError instanceof Error ? callbackError.message : "Calendar OAuth failed.",
    });
    saveState(serverState);
    sendHtml(
      response,
      500,
      "Taplo calendar connection failed",
      callbackError instanceof Error ? callbackError.message : "Calendar OAuth failed.",
    );
  }
}

async function syncCalendarEvents() {
  const serverState = loadState();
  const connected = serverState.calendarConnections.filter((connection) => connection.status === "connected" && connection.recallCalendarId);
  const meetings: Meeting[] = [];
  const nextConnections: CalendarConnection[] = [];

  if (!config.recallApiKey) {
    return {
      connections: serverState.calendarConnections.map((connection) => ({
        ...connection,
        syncStatus: "error",
        syncError: "Backend is missing RECALL_API_KEY.",
      })),
      meetings,
    };
  }

  for (const connection of connected) {
    try {
      const events = await listCalendarEvents(connection.recallCalendarId as string);
      meetings.push(
        ...events
          .map((event) => normalizeCalendarEvent(event, connection.provider))
          .filter((meeting) => Boolean(meeting.joinUrl?.trim())),
      );
      nextConnections.push({
        ...connection,
        status: "connected",
        lastSyncedAt: new Date().toISOString(),
        syncStatus: "success",
        syncError: undefined,
      });
    } catch (syncError) {
      nextConnections.push({
        ...connection,
        status: "error",
        syncStatus: "error",
        syncError: syncError instanceof Error ? syncError.message : "Calendar sync failed.",
      });
    }
  }

  serverState.calendarConnections = serverState.calendarConnections.map((connection) => {
    const updated = nextConnections.find((item) => item.id === connection.id);
    return updated ?? connection;
  });
  saveState(serverState);

  return {
    connections: serverState.calendarConnections,
    meetings,
  };
}

async function createDesktopSdkUpload(input: unknown) {
  const body = isRecord(input) ? input : {};
  const metadata = isRecord(body.metadata)
    ? Object.fromEntries(
        Object.entries(body.metadata)
          .filter(([, value]) => typeof value === "string")
          .map(([key, value]) => [key, value as string]),
      )
    : {};
  const upload = await recallRequest<RecallDesktopSdkUpload>("/api/v1/sdk_upload/", {
    method: "POST",
    body: {
      metadata: {
        ...metadata,
        app: "taplo",
      },
    },
  });

  return {
    id: upload.id,
    recordingId: upload.recording_id ?? undefined,
    uploadToken: upload.upload_token,
    status: upload.status,
    apiBaseUrl: config.recallApiBaseUrl,
  };
}

async function generateLiveGuidance(input: unknown) {
  const body = isRecord(input) ? input : {};
  const sessionId = stringValue(body.sessionId) || randomUUID();
  const meeting = isRecord(body.meeting) ? body.meeting : {};
  const transcriptSegments = arrayValue(body.transcriptSegments).filter(isRecord) as TranscriptSegment[];
  const transcript = formatTranscript(transcriptSegments);
  const result = await callClaudeJson(
    [
      "You are Taplo, an expert recruiter copilot listening to an interview.",
      "Return concise JSON only with keys: coveredTopics, gaps, suggestedFollowUps.",
      "Each key must be an array of 2-5 short strings. Base the output on the transcript and job context.",
    ].join("\n"),
    {
      candidateName: stringValue(meeting.candidateName),
      roleTitle: stringValue(meeting.roleTitle),
      jobDescription: stringValue(meeting.jobDescription),
      recruiterNotes: stringValue(meeting.recruiterNotes),
      transcript,
    },
  );

  return {
    id: randomUUID(),
    sessionId,
    createdAt: new Date().toISOString(),
    coveredTopics: stringArray(result.coveredTopics, ["Interview setup"]),
    gaps: stringArray(result.gaps, ["Compensation expectations", "Notice period"]),
    suggestedFollowUps: stringArray(result.suggestedFollowUps, ["Ask for a concrete example relevant to the role."]),
    provider: "claude",
    model: config.anthropicModel,
  };
}

async function generateAnalysis(input: unknown) {
  const body = isRecord(input) ? input : {};
  const sessionId = stringValue(body.sessionId) || randomUUID();
  const meeting = isRecord(body.meeting) ? body.meeting : {};
  const transcriptSegments = arrayValue(body.transcriptSegments).filter(isRecord) as TranscriptSegment[];
  const transcript = formatTranscript(transcriptSegments);
  const result = await callClaudeJson(
    [
      "You are Taplo, an expert recruiter assistant.",
      "Analyze the interview transcript and return JSON only.",
      "Required keys: candidateSummary, experienceSignals, technicalSignals, communicationObservations, concernsAndMissingInfo, clientSubmissionDraft, followUpEmailDraft, internalRecruiterNotes.",
      "experienceSignals and technicalSignals must be arrays of objects with label and evidence.",
      "Use evidence from the transcript. If evidence is missing, say what is missing instead of inventing it.",
    ].join("\n"),
    {
      candidateName: stringValue(meeting.candidateName),
      roleTitle: stringValue(meeting.roleTitle),
      jobDescription: stringValue(meeting.jobDescription),
      candidateCv: stringValue(meeting.candidateCv),
      recruiterNotes: stringValue(meeting.recruiterNotes),
      transcript,
    },
  );
  const analysis = normalizeAnalysis(result, meeting, transcript);

  return {
    id: randomUUID(),
    sessionId,
    createdAt: new Date().toISOString(),
    ...analysis,
    provider: "claude",
    model: config.anthropicModel,
  };
}

async function callClaudeJson(system: string, context: Record<string, unknown>) {
  if (!config.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured on the backend.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      model: config.anthropicModel,
      max_tokens: 1800,
      temperature: 0.2,
      system,
      messages: [
        {
          role: "user",
          content: `Context JSON:\n${JSON.stringify(context, null, 2)}\n\nReturn valid JSON only.`,
        },
      ],
    }),
  });
  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(stringValue(payload.error && isRecord(payload.error) ? payload.error.message : undefined) || `Claude request failed with ${response.status}.`);
  }

  const content = arrayValue(payload.content);
  const text = content
    .map((item) => (isRecord(item) && item.type === "text" ? stringValue(item.text) : ""))
    .join("\n")
    .trim();

  return parseJsonObject(text);
}

function normalizeAnalysis(raw: Record<string, unknown>, meeting: Record<string, unknown>, transcript: string): AnalysisOutput {
  const candidate = stringValue(meeting.candidateName) || "the candidate";
  const role = stringValue(meeting.roleTitle) || "the role";

  return {
    candidateSummary:
      stringValue(raw.candidateSummary) ||
      `${candidate} was interviewed for ${role}. More transcript evidence is needed for a confident recommendation.`,
    experienceSignals: evidenceArray(raw.experienceSignals, [
      {
        label: "Experience evidence",
        evidence: transcript || "Transcript was not available for evidence extraction.",
      },
    ]),
    technicalSignals: evidenceArray(raw.technicalSignals, [
      {
        label: "Technical evidence",
        evidence: "Technical depth could not be confirmed from the available transcript.",
      },
    ]),
    communicationObservations: stringArray(raw.communicationObservations, ["Communication observations require more transcript evidence."]),
    concernsAndMissingInfo: stringArray(raw.concernsAndMissingInfo, ["Confirm compensation expectations, notice period, and role-specific technical depth."]),
    clientSubmissionDraft:
      stringValue(raw.clientSubmissionDraft) ||
      `${candidate} interviewed for ${role}. A client submission draft requires more confirmed interview evidence.`,
    followUpEmailDraft:
      stringValue(raw.followUpEmailDraft) ||
      `Hi ${candidate},\n\nThanks for speaking today. I will follow up shortly with next steps.\n\nBest,\nTaplo Recruiting`,
    internalRecruiterNotes:
      stringValue(raw.internalRecruiterNotes) ||
      "Review transcript evidence before submitting. Follow up on missing salary, availability, and technical-depth details.",
  };
}

function getConfig(): AppConfig {
  const region = process.env.RECALL_REGION || "eu-central-1";
  const publicUrl = process.env.TAPLO_BACKEND_PUBLIC_URL || `http://127.0.0.1:${process.env.TAPLO_BACKEND_PORT || "8787"}`;

  return {
    port: Number(process.env.TAPLO_BACKEND_PORT || 8787),
    publicUrl,
    callbackUrl: `${publicUrl}/api/calendar/oauth/callback`,
    recallApiKey: process.env.RECALL_API_KEY,
    recallApiBaseUrl: process.env.RECALL_API_BASE_URL || REGION_HOSTS[region] || REGION_HOSTS["eu-central-1"],
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
    google: createProviderConfig(process.env.GOOGLE_CALENDAR_CLIENT_ID, process.env.GOOGLE_CALENDAR_CLIENT_SECRET, [
      "openid",
      "email",
      "https://www.googleapis.com/auth/calendar.events.readonly",
      "https://www.googleapis.com/auth/calendar.readonly",
    ]),
    outlook: createProviderConfig(process.env.MICROSOFT_CALENDAR_CLIENT_ID, process.env.MICROSOFT_CALENDAR_CLIENT_SECRET, [
      "offline_access",
      "User.Read",
      "Calendars.Read",
    ]),
  };
}

function buildProviderAuthUrl(provider: CalendarProvider, state: string) {
  const oauth = providerConfig(provider);

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

async function exchangeProviderCode(provider: CalendarProvider, code: string) {
  const oauth = providerConfig(provider);
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

  if (typeof payload.refresh_token !== "string") {
    throw new Error(`${provider} did not return a refresh token. Reconnect and allow offline access.`);
  }

  return {
    refreshToken: payload.refresh_token,
    scope: typeof payload.scope === "string" ? payload.scope : undefined,
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
}

async function upsertRecallCalendar(input: {
  provider: CalendarProvider;
  refreshToken: string;
  oauthClientId: string;
  oauthClientSecret: string;
  existingCalendarId?: string;
}) {
  if (input.existingCalendarId) {
    return recallRequest<RecallCalendarRecord>(`/api/v2/calendars/${input.existingCalendarId}/`, {
      method: "PATCH",
      body: {
        oauth_client_id: input.oauthClientId,
        oauth_client_secret: input.oauthClientSecret,
        oauth_refresh_token: input.refreshToken,
      },
    });
  }

  const calendars = await recallRequest<{ results?: RecallCalendarRecord[] }>("/api/v2/calendars/");
  const existing = (calendars.results ?? []).find((calendar) => calendar.platform === toRecallPlatform(input.provider));

  if (existing?.id) {
    return upsertRecallCalendar({ ...input, existingCalendarId: existing.id });
  }

  return recallRequest<RecallCalendarRecord>("/api/v2/calendars/", {
    method: "POST",
    body: {
      platform: toRecallPlatform(input.provider),
      oauth_client_id: input.oauthClientId,
      oauth_client_secret: input.oauthClientSecret,
      oauth_refresh_token: input.refreshToken,
    },
  });
}

async function listCalendarEvents(calendarId: string) {
  const params = new URLSearchParams({
    calendar_id: calendarId,
    start_time__gte: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    start_time__lte: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
  });
  const payload = await recallRequest<{ results?: RecallCalendarEvent[] }>(`/api/v2/calendar-events/?${params.toString()}`);
  return payload.results ?? [];
}

async function recallRequest<T>(pathname: string, init?: { method?: string; body?: Record<string, unknown> }) {
  if (!config.recallApiKey) {
    throw new Error("RECALL_API_KEY is not configured on the backend.");
  }

  const response = await fetch(`${config.recallApiBaseUrl}${pathname}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Token ${config.recallApiKey}`,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T & { detail?: string }) : ({} as T & { detail?: string });

  if (!response.ok) {
    throw new Error(payload.detail || `Recall request failed with ${response.status}.`);
  }

  return payload as T;
}

async function readJsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }

  return JSON.parse(raw) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function stringArray(value: unknown, fallback: string[]) {
  const items = arrayValue(value).filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return items.length ? items : fallback;
}

function evidenceArray(value: unknown, fallback: Array<{ label: string; evidence: string }>) {
  const items = arrayValue(value)
    .filter(isRecord)
    .map((item) => ({
      label: stringValue(item.label),
      evidence: stringValue(item.evidence),
    }))
    .filter((item) => item.label && item.evidence);

  return items.length ? items : fallback;
}

function formatTranscript(segments: TranscriptSegment[]) {
  return segments
    .map((segment) => `${segment.speaker || "Speaker"}: ${segment.text || ""}`.trim())
    .filter(Boolean)
    .join("\n");
}

function parseJsonObject(text: string) {
  const direct = tryParseJson(text);
  if (direct) {
    return direct;
  }

  const match = text.match(/\{[\s\S]*\}/);
  const extracted = match ? tryParseJson(match[0]) : undefined;
  if (extracted) {
    return extracted;
  }

  throw new Error("Claude did not return valid JSON.");
}

function tryParseJson(text: string) {
  try {
    const value = JSON.parse(text) as unknown;
    return isRecord(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function parseCalendarEventTitle(title: string) {
  const cleaned = title.replace(/^interview:\s*/i, "").trim();
  const parts = cleaned.split(/\s*-\s*/);

  return {
    candidateName: parts[0]?.trim() || "Unknown candidate",
    roleTitle: parts.slice(1).join(" - ").trim() || "Interview",
  };
}

function normalizeCalendarEvent(event: RecallCalendarEvent, provider: CalendarProvider): Meeting {
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
    recruiterNotes: "Synced from Taplo backend via Recall Calendar V2.",
    scheduledAt: event.start_time ?? new Date().toISOString(),
    cancelledAt: cancelled ? new Date().toISOString() : undefined,
    status: cancelled ? "cancelled" : "upcoming",
  };
}

function validateProviderScopes(provider: CalendarProvider, scope?: string) {
  if (!scope || provider !== "google") {
    return;
  }

  const hasCalendarScope = scope.split(/\s+/).some((item) =>
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

function loadState(): ServerState {
  if (!fs.existsSync(statePath)) {
    return { pendingOAuthStates: [], calendarConnections: [] };
  }

  return JSON.parse(fs.readFileSync(statePath, "utf8")) as ServerState;
}

function saveState(state: ServerState) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function upsertConnection(connections: CalendarConnection[], connection: CalendarConnection) {
  return [connection, ...connections.filter((item) => item.provider !== connection.provider)];
}

function connectionForProvider(state: ServerState, provider: CalendarProvider) {
  return state.calendarConnections.find((connection) => connection.provider === provider) ?? {
    id: randomUUID(),
    provider,
    email: `${provider} calendar`,
    status: "connecting" as const,
    connectedAt: new Date().toISOString(),
  };
}

function providerConfig(provider: CalendarProvider) {
  const oauth = provider === "google" ? config.google : config.outlook;

  if (!oauth) {
    throw new Error(`Missing ${provider} OAuth credentials on the backend.`);
  }

  return oauth;
}

function ensureProviderReady(provider: CalendarProvider) {
  if (!config.recallApiKey) {
    throw new Error("Missing RECALL_API_KEY on the backend.");
  }

  providerConfig(provider);
}

function createProviderConfig(clientId?: string, clientSecret?: string, scopes: string[] = []) {
  if (!clientId || !clientSecret) {
    return undefined;
  }

  return { clientId, clientSecret, scopes };
}

function toRecallPlatform(provider: CalendarProvider) {
  return provider === "google" ? "google_calendar" : "microsoft_outlook";
}

function isProvider(value: string | undefined): value is CalendarProvider {
  return value === "google" || value === "outlook";
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  response.end(JSON.stringify(body));
}

function sendHtml(response: ServerResponse, statusCode: number, title: string, message: string) {
  response.writeHead(statusCode, { "Content-Type": "text/html" });
  response.end(`<!doctype html><html><body style="font-family: sans-serif; padding: 32px;"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></body></html>`);
}

function redirect(response: ServerResponse, location: string) {
  response.writeHead(302, { Location: location });
  response.end();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}
