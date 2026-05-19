import { app, BrowserWindow, ipcMain, shell } from "electron";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import initSqlJs, { type Database } from "sql.js";
import {
  buildProviderAuthUrl,
  createOAuthState,
  exchangeProviderCode,
  getRecallCalendarConfig,
  hasProviderCredentials,
  hasTaploMeetingJoinLink,
  normalizeCalendarEvent,
  providerConfig,
  RecallCalendarV2Client,
  validateProviderScopes,
  type CalendarProvider,
  type OAuthPendingState,
  type TaploMeetingRecord,
} from "./recall-calendar-v2";
import { RecallDesktopRecorder } from "./recall-desktop";
import { fetchRecallSessionTranscript } from "./recall-transcript-client";

type JsonRecord = Record<string, unknown>;

let mainWindow: BrowserWindow | null = null;
let panelWindow: BrowserWindow | null = null;
let database: Database | null = null;
let reminderTimer: NodeJS.Timeout | null = null;
let staticServer: http.Server | null = null;
let staticServerBaseUrl: string | null = null;
const pendingOAuthStates = new Map<string, OAuthPendingState>();
const recallRecorder = new RecallDesktopRecorder();

const REMINDER_LEAD_MS = 10 * 60 * 1000;
const REMINDER_GRACE_MS = 5 * 60 * 1000;
const REMINDER_CHECK_MS = 30 * 1000;
const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
}

function resolveAppIconPath() {
  const candidates = [
    path.join(process.resourcesPath, "icon.png"),
    path.join(app.getAppPath(), "branding", "icon.png"),
    path.join(__dirname, "..", "..", "branding", "icon.png"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

const emptyWorkspace = () => ({
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
});

async function createWindow() {
  const iconPath = resolveAppIconPath();

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: "Taplo",
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const startUrl = process.env.ELECTRON_START_URL;

  if (startUrl) {
    await mainWindow.loadURL(startUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
    return;
  }

  await mainWindow.loadURL(`${await getStaticServerBaseUrl()}/index.html`);
}

async function createPanelWindow(meetingId: string) {
  if (panelWindow && !panelWindow.isDestroyed()) {
    panelWindow.focus();
    return;
  }

  const iconPath = resolveAppIconPath();

  panelWindow = new BrowserWindow({
    width: 460,
    height: 720,
    minWidth: 420,
    minHeight: 600,
    title: "Taplo Meeting Panel",
    ...(iconPath ? { icon: iconPath } : {}),
    alwaysOnTop: true,
    fullscreenable: false,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  panelWindow.on("closed", () => {
    panelWindow = null;
  });

  const startUrl = process.env.ELECTRON_START_URL;

  if (startUrl) {
    await panelWindow.loadURL(`${startUrl}/panel?meetingId=${encodeURIComponent(meetingId)}`);
    return;
  }

  await panelWindow.loadURL(`${await getStaticServerBaseUrl()}/panel.html?meetingId=${encodeURIComponent(meetingId)}`);
}

async function getStaticServerBaseUrl() {
  if (staticServerBaseUrl) {
    return staticServerBaseUrl;
  }

  const outDir = path.join(app.getAppPath(), "out");
  staticServer = http.createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const pathname = decodeURIComponent(requestUrl.pathname);
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const filePath = path.normalize(path.join(outDir, relativePath));

    if (!filePath.startsWith(outDir)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    fs.stat(filePath, (statError, stat) => {
      if (statError || !stat.isFile()) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      response.writeHead(200, { "Content-Type": getContentType(filePath) });
      fs.createReadStream(filePath).pipe(response);
    });
  });

  await new Promise<void>((resolve, reject) => {
    staticServer?.once("error", reject);
    staticServer?.listen(0, "127.0.0.1", () => resolve());
  });

  const address = staticServer.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to start Taplo static server");
  }

  staticServerBaseUrl = `http://127.0.0.1:${address.port}`;
  return staticServerBaseUrl;
}

function getContentType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".txt":
      return "text/plain; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

async function getDb() {
  if (database) {
    return database;
  }

  const SQL = await initSqlJs({
    locateFile: (file) => path.join(app.getAppPath(), "node_modules", "sql.js", "dist", file),
  });
  const dbPath = getDbPath();

  database = fs.existsSync(dbPath) ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database();
  migrate(database);
  persistDb();

  return database;
}

function getDbPath() {
  const dataDir = path.join(app.getPath("userData"), "workspace");
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "taplo.sqlite");
}

function migrate(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS meetings (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS transcript_segments (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS analyses (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS usage_events (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS calendar_connections (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS meeting_panel_states (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  `);
}

function persistDb() {
  if (!database) {
    return;
  }

  fs.writeFileSync(getDbPath(), Buffer.from(database.export()));
}

async function loadWorkspace() {
  const db = await getDb();
  const workspace = emptyWorkspace();

  return {
    ...workspace,
    meetings: readTable(db, "meetings"),
    sessions: readTable(db, "sessions"),
    transcriptSegments: readTable(db, "transcript_segments"),
    analyses: readTable(db, "analyses"),
    usageEvents: readTable(db, "usage_events"),
    calendarConnections: readTable(db, "calendar_connections"),
    meetingPanelStates: readTable(db, "meeting_panel_states"),
    settings: readOne(db, "settings", "workspace") ?? workspace.settings,
  };
}

async function saveWorkspace(workspace: JsonRecord) {
  const db = await getDb();

  writeTable(db, "meetings", (workspace.meetings as JsonRecord[]) ?? []);
  writeTable(db, "sessions", (workspace.sessions as JsonRecord[]) ?? []);
  writeTable(db, "transcript_segments", (workspace.transcriptSegments as JsonRecord[]) ?? []);
  writeTable(db, "analyses", (workspace.analyses as JsonRecord[]) ?? []);
  writeTable(db, "usage_events", (workspace.usageEvents as JsonRecord[]) ?? []);
  writeTable(db, "calendar_connections", (workspace.calendarConnections as JsonRecord[]) ?? []);
  writeTable(db, "meeting_panel_states", (workspace.meetingPanelStates as JsonRecord[]) ?? []);
  writeOne(db, "settings", "workspace", (workspace.settings as JsonRecord) ?? emptyWorkspace().settings);
  persistDb();

  return loadWorkspace();
}

function readTable(db: Database, tableName: string) {
  const result = db.exec(`SELECT data FROM ${tableName}`);
  const rows = result[0]?.values ?? [];
  return rows.map((row) => JSON.parse(String(row[0])));
}

function readOne(db: Database, tableName: string, id: string) {
  const statement = db.prepare(`SELECT data FROM ${tableName} WHERE id = ?`);
  statement.bind([id]);
  const row = statement.step() ? statement.getAsObject() : null;
  statement.free();
  return row ? JSON.parse(String(row.data)) : null;
}

function writeTable(db: Database, tableName: string, rows: JsonRecord[]) {
  db.run(`DELETE FROM ${tableName}`);

  const statement = db.prepare(`INSERT INTO ${tableName} (id, data) VALUES (?, ?)`);
  rows.forEach((row) => {
    statement.run([String(row.id ?? row.meetingId), JSON.stringify(row)]);
  });
  statement.free();
}

function writeOne(db: Database, tableName: string, id: string, value: JsonRecord) {
  const statement = db.prepare(`INSERT OR REPLACE INTO ${tableName} (id, data) VALUES (?, ?)`);
  statement.run([id, JSON.stringify(value)]);
  statement.free();
}

function createUsageEvent(kind: string, quantity: number, sessionId?: string) {
  const rates: Record<string, number> = {
    recording: 0.18 / 3600,
    live_ai: 0.004,
    final_ai: 0.035,
    calendar_sync: 0.001,
  };

  return {
    id: randomUUID(),
    sessionId,
    createdAt: new Date().toISOString(),
    kind,
    quantity,
    unit: kind === "recording" ? "second" : "request",
    estimatedCostUsd: quantity * (rates[kind] ?? 0),
  };
}

function createMockTranscript(sessionId: string) {
  return [
    ["Interviewer", "Can you walk me through the most relevant project for this role?", 0, 4500],
    [
      "Candidate",
      "I led a TypeScript migration for a hiring platform and coordinated delivery across product, design, and QA.",
      4600,
      12800,
    ],
    ["Interviewer", "What trade-offs did you make during the rollout?", 13000, 16600],
    [
      "Candidate",
      "We used feature flags and migrated one workflow at a time so recruiters could continue using the product during the rollout.",
      17000,
      24500,
    ],
  ].map(([speaker, text, startMs, endMs]) => ({
    id: randomUUID(),
    sessionId,
    speaker,
    text,
    startMs,
    endMs,
    final: true,
  }));
}

function createMockCalendarMeetings() {
  const now = Date.now();

  return [
    {
      id: "calendar-mock-google-primary",
      source: "calendar",
      candidateName: "Alex Morgan",
      roleTitle: "Product Engineer",
      jobDescription: "Full-stack role with React, Node.js, product discovery, and client-facing delivery.",
      candidateCv: "Calendar invite placeholder. Add CV before recording for richer analysis.",
      recruiterNotes: "Synced from calendar. Confirm salary expectations and notice period.",
      scheduledAt: new Date(now + 9 * 60 * 1000).toISOString(),
      calendarEventId: "mock-google-primary",
      calendarProvider: "google",
      joinUrl: "https://meet.google.com/taplo-demo",
      status: "upcoming",
    },
    {
      id: "calendar-mock-outlook-primary",
      source: "calendar",
      candidateName: "Priya Shah",
      roleTitle: "Data Platform Lead",
      jobDescription: "Leadership role covering data platform reliability, governance, and stakeholder management.",
      candidateCv: "Calendar invite placeholder. Attach CV after sync.",
      recruiterNotes: "Ask about team size, cloud data stack, and migration experience.",
      scheduledAt: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(),
      calendarEventId: "mock-outlook-primary",
      calendarProvider: "outlook",
      joinUrl: "https://teams.microsoft.com/l/meetup-join/taplo-demo",
      status: "upcoming",
    },
  ];
}

function isCalendarProvider(value: string): value is CalendarProvider {
  return value === "google" || value === "outlook";
}

function getBackendApiBaseUrl() {
  return process.env.TAPLO_API_BASE_URL?.replace(/\/$/, "");
}

async function syncCalendarViaBackend(workspace: JsonRecord, apiBaseUrl: string) {
  const response = await fetch(`${apiBaseUrl}/api/calendar/sync`, {
    headers: { Accept: "application/json" },
  });
  const payload = (await response.json()) as {
    connections?: JsonRecord[];
    meetings?: TaploMeetingRecord[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || `Taplo backend sync failed with ${response.status}.`);
  }

  const syncedProviders = (payload.connections ?? [])
    .map((connection) => String(connection.provider))
    .filter(isCalendarProvider);
  const merged = mergeSyncedCalendarMeetings(
    {
      ...workspace,
      calendarConnections: payload.connections ?? workspace.calendarConnections,
    },
    payload.meetings ?? [],
    syncedProviders,
  ) as JsonRecord;

  return saveWorkspace({
    ...merged,
    calendarConnections: payload.connections ?? merged.calendarConnections,
  });
}

function withCalendarStatus(
  workspace: JsonRecord,
  provider: CalendarProvider,
  status: "connecting" | "connected" | "disconnected" | "error",
  extra: JsonRecord = {},
) {
  const now = new Date().toISOString();
  const existing = ((workspace.calendarConnections as JsonRecord[]) ?? []).find((item) => item.provider === provider);
  const connection = {
    id: String(existing?.id ?? randomUUID()),
    provider,
    email: String(extra.email ?? existing?.email ?? `${provider} calendar`),
    recallCalendarId: extra.recallCalendarId ?? existing?.recallCalendarId,
    connectedAt: String(existing?.connectedAt ?? now),
    lastSyncedAt: extra.lastSyncedAt ?? existing?.lastSyncedAt,
    syncStatus: extra.syncStatus ?? existing?.syncStatus ?? "idle",
    syncError: extra.syncError,
    status,
  };

  return {
    ...workspace,
    calendarConnections: [
      connection,
      ...((workspace.calendarConnections as JsonRecord[]) ?? []).filter((item) => item.provider !== provider),
    ],
  };
}

function mergeSyncedCalendarMeetings(
  workspace: JsonRecord,
  syncedMeetings: TaploMeetingRecord[],
  syncedProviders: CalendarProvider[],
) {
  const usageEvent = createUsageEvent("calendar_sync", 1);
  const linkableMeetings = syncedMeetings.filter(hasTaploMeetingJoinLink);
  const syncedKeys = new Set(linkableMeetings.map((meeting) => meeting.calendarEventId ?? meeting.id));
  const meetings = [...((workspace.meetings as JsonRecord[]) ?? [])];

  linkableMeetings.forEach((syncedMeeting) => {
    const index = meetings.findIndex(
      (meeting) =>
        (syncedMeeting.calendarEventId && meeting.calendarEventId === syncedMeeting.calendarEventId) ||
        meeting.id === syncedMeeting.id,
    );

    if (index === -1) {
      meetings.unshift(syncedMeeting);
      return;
    }

    const existing = meetings[index];
    meetings[index] = {
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
    meetings: meetings.map((meeting) => {
      if (
        meeting.source === "calendar" &&
        meeting.status === "upcoming" &&
        syncedProviders.includes(meeting.calendarProvider as CalendarProvider) &&
        !syncedKeys.has(String(meeting.calendarEventId ?? meeting.id))
      ) {
        return {
          ...meeting,
          status: "cancelled",
          cancelledAt: new Date().toISOString(),
        };
      }

      return meeting;
    }),
    usageEvents: [...((workspace.usageEvents as JsonRecord[]) ?? []), usageEvent],
  };
}

async function syncRecallCalendarV2(workspace: JsonRecord) {
  const config = getRecallCalendarConfig();
  const connectedConnections = ((workspace.calendarConnections as JsonRecord[]) ?? []).filter(
    (connection) => connection.status === "connected" && typeof connection.recallCalendarId === "string",
  );

  if (!config.enabled || connectedConnections.length === 0) {
    return saveWorkspace({
      ...withCalendarStatus(withCalendarStatus(workspace, "google", "connected", { syncStatus: "mock" }), "outlook", "connected", {
        syncStatus: "mock",
      }),
      meetings: mergeSyncedCalendarMeetings(workspace, createMockCalendarMeetings() as TaploMeetingRecord[], ["google", "outlook"]).meetings,
      usageEvents: [...((workspace.usageEvents as JsonRecord[]) ?? []), createUsageEvent("calendar_sync", 1)],
    });
  }

  const client = new RecallCalendarV2Client(config);
  const syncedMeetings: TaploMeetingRecord[] = [];
  const syncedProviders: CalendarProvider[] = [];
  let nextWorkspace = {
    ...workspace,
    calendarConnections: ((workspace.calendarConnections as JsonRecord[]) ?? []).map((connection) =>
      connection.status === "connected" ? { ...connection, syncStatus: "syncing", syncError: undefined } : connection,
    ),
  };

  for (const connection of connectedConnections) {
    const provider = String(connection.provider);

    if (!isCalendarProvider(provider)) {
      continue;
    }

    try {
      const events = await client.listCalendarEvents(String(connection.recallCalendarId));
      syncedMeetings.push(
        ...events.map((event) => normalizeCalendarEvent(event, provider)).filter(hasTaploMeetingJoinLink),
      );
      syncedProviders.push(provider);
      nextWorkspace = withCalendarStatus(nextWorkspace, provider, "connected", {
        recallCalendarId: connection.recallCalendarId,
        email: connection.email,
        lastSyncedAt: new Date().toISOString(),
        syncStatus: "success",
        syncError: undefined,
      });
    } catch (error) {
      nextWorkspace = withCalendarStatus(nextWorkspace, provider, "error", {
        recallCalendarId: connection.recallCalendarId,
        email: connection.email,
        syncStatus: "error",
        syncError: error instanceof Error ? error.message : "Calendar sync failed.",
      });
    }
  }

  const merged = mergeSyncedCalendarMeetings(nextWorkspace, syncedMeetings, syncedProviders) as JsonRecord;
  return saveWorkspace({
    ...merged,
    calendarConnections: ((merged.calendarConnections as JsonRecord[]) ?? []).map((connection) =>
      syncedProviders.includes(connection.provider as CalendarProvider)
        ? { ...connection, lastSyncedAt: new Date().toISOString() }
        : connection,
    ),
  });
}

async function handleCalendarOAuthCallback(callbackUrl: string) {
  const url = new URL(callbackUrl);

  if (url.protocol !== "taplo:" || url.hostname !== "calendar" || !url.pathname.includes("oauth-callback")) {
    return;
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const workspace = await loadWorkspace();

  if (!state || !pendingOAuthStates.has(state)) {
    return;
  }

  const pending = pendingOAuthStates.get(state);
  pendingOAuthStates.delete(state);

  if (!pending) {
    return;
  }

  if (error || !code) {
    await saveWorkspace(
      withCalendarStatus(workspace, pending.provider, "error", {
        syncStatus: "error",
        syncError: error || "Calendar OAuth callback did not include an authorization code.",
      }),
    );
    return;
  }

  try {
    const config = getRecallCalendarConfig();
    const oauth = providerConfig(config, pending.provider);

    if (!oauth) {
      throw new Error(`Missing ${pending.provider} OAuth client credentials.`);
    }

    const token = await exchangeProviderCode(config, pending.provider, code);
    validateProviderScopes(pending.provider, token.scope);

    const existingConnection = ((workspace.calendarConnections as JsonRecord[]) ?? []).find(
      (connection) => connection.provider === pending.provider,
    );
    const client = new RecallCalendarV2Client(config);
    const calendar = await client.upsertCalendar({
      provider: pending.provider,
      refreshToken: token.refreshToken,
      oauthClientId: oauth.clientId,
      oauthClientSecret: oauth.clientSecret,
      existingCalendarId: typeof existingConnection?.recallCalendarId === "string" ? existingConnection.recallCalendarId : undefined,
    });

    await saveWorkspace(
      withCalendarStatus(workspace, pending.provider, "connected", {
        recallCalendarId: calendar.id,
        email: calendar.email ?? token.email ?? `${pending.provider} calendar`,
        syncStatus: "idle",
        syncError: undefined,
      }),
    );
  } catch (error) {
    await saveWorkspace(
      withCalendarStatus(workspace, pending.provider, "error", {
        syncStatus: "error",
        syncError: error instanceof Error ? error.message : "Calendar OAuth failed.",
      }),
    );
  }
}

function registerCalendarDeepLinks() {
  if (process.defaultApp) {
    app.setAsDefaultProtocolClient("taplo", process.execPath, [process.argv[1] ?? ""]);
  } else {
    app.setAsDefaultProtocolClient("taplo");
  }

  app.on("open-url", (event, url) => {
    event.preventDefault();
    void handleCalendarOAuthCallback(url);
  });

  app.on("second-instance", (_event, argv) => {
    const callbackUrl = argv.find((arg) => arg.startsWith("taplo://"));

    if (callbackUrl) {
      void handleCalendarOAuthCallback(callbackUrl);
    }
  });
}

async function runReminderCheck() {
  const workspace = await loadWorkspace();
  const now = Date.now();
  const upcomingMeeting = (workspace.meetings as JsonRecord[])
    .filter((meeting) => {
      const scheduledAt = new Date(String(meeting.scheduledAt)).getTime();
      const opensAt = scheduledAt - REMINDER_LEAD_MS;
      const expiresAt = scheduledAt + REMINDER_GRACE_MS;

      return (
        meeting.status === "upcoming" &&
        typeof meeting.joinUrl === "string" &&
        meeting.joinUrl.trim().length > 0 &&
        !meeting.startsAtReminderShown &&
        !meeting.panelDismissedAt &&
        now >= opensAt &&
        now <= expiresAt
      );
    })
    .sort((a, b) => new Date(String(a.scheduledAt)).getTime() - new Date(String(b.scheduledAt)).getTime())[0];

  if (!upcomingMeeting) {
    return;
  }

  const shownAt = new Date().toISOString();
  await saveWorkspace({
    ...workspace,
    meetings: workspace.meetings.map((meeting: JsonRecord) =>
      meeting.id === upcomingMeeting.id ? { ...meeting, startsAtReminderShown: shownAt } : meeting,
    ),
    meetingPanelStates: [
      {
        meetingId: upcomingMeeting.id,
        status: "open",
        openedAt: shownAt,
      },
      ...workspace.meetingPanelStates.filter((state: JsonRecord) => state.meetingId !== upcomingMeeting.id),
    ],
  });

  await createPanelWindow(String(upcomingMeeting.id));
}

function startReminderScheduler() {
  if (reminderTimer) {
    return;
  }

  void runReminderCheck();
  reminderTimer = setInterval(() => {
    void runReminderCheck();
  }, REMINDER_CHECK_MS);
}

function getSessionContext(workspace: JsonRecord, sessionId: string) {
  const sessions = (workspace.sessions as JsonRecord[]) ?? [];
  const meetings = (workspace.meetings as JsonRecord[]) ?? [];
  const transcriptSegments = ((workspace.transcriptSegments as JsonRecord[]) ?? []).filter(
    (segment) => segment.sessionId === sessionId,
  );
  const session = sessions.find((item) => item.id === sessionId);
  const meeting = meetings.find((item) => item.id === session?.meetingId);

  return { meeting, session, transcriptSegments };
}

function createGuidance(sessionId: string, transcriptSegments: JsonRecord[]) {
  return {
    id: randomUUID(),
    sessionId,
    createdAt: new Date().toISOString(),
    coveredTopics: transcriptSegments.length
      ? ["Recent project ownership", "Delivery approach", "Stakeholder collaboration"]
      : ["Interview setup"],
    gaps: ["Compensation expectations", "Notice period", "Specific technical depth"],
    suggestedFollowUps: [
      "Ask for a concrete example of debugging a production issue.",
      "Confirm candidate motivation for this role.",
      "Probe team leadership and mentoring scope.",
    ],
  };
}

function createAnalysis(sessionId: string, meeting?: JsonRecord) {
  const candidate = String(meeting?.candidateName ?? "the candidate");
  const role = String(meeting?.roleTitle ?? "the role");

  return {
    id: randomUUID(),
    sessionId,
    createdAt: new Date().toISOString(),
    candidateSummary: `${candidate} appears aligned to ${role}, with evidence of delivery ownership, cross-functional communication, and pragmatic rollout decisions.`,
    experienceSignals: [
      {
        label: "Delivery ownership",
        evidence: "Candidate described leading a migration and coordinating delivery across multiple functions.",
      },
      {
        label: "Stakeholder management",
        evidence: "Referenced product, design, and QA collaboration during rollout.",
      },
    ],
    technicalSignals: [
      {
        label: "TypeScript and React depth",
        evidence: "Referenced a TypeScript migration in a recruiter-facing product.",
      },
      {
        label: "Release management",
        evidence: "Used feature flags and incremental workflow migration to reduce delivery risk.",
      },
    ],
    communicationObservations: [
      "Answers were structured around business context, action, and outcome.",
      "Explained trade-offs in recruiter-friendly language.",
    ],
    concernsAndMissingInfo: [
      "Compensation expectations were not captured.",
      "Availability and notice period need confirmation.",
      "More detail is needed on hands-on technical contribution versus coordination.",
    ],
    clientSubmissionDraft: `${candidate} is a strong potential match for ${role}. They gave relevant examples of leading migration work, managing rollout risk with feature flags, and coordinating with product, design, and QA.`,
    followUpEmailDraft: `Hi ${candidate},\n\nThanks for speaking today. I enjoyed learning more about your recent platform migration work and how you approached rollout risk. Could you confirm your notice period and compensation expectations?\n\nBest,\nTaplo Recruiting`,
    internalRecruiterNotes:
      "Good client submission candidate if technical depth checks out. Follow up on salary, notice period, and specific hands-on coding scope before shortlisting.",
  };
}

async function requestBackendAi(pathname: "/api/ai/live-guidance" | "/api/ai/analyze-session", body: JsonRecord) {
  const backendApiBaseUrl = getBackendApiBaseUrl();

  if (!backendApiBaseUrl) {
    throw new Error("TAPLO_API_BASE_URL is not configured.");
  }

  const response = await fetch(`${backendApiBaseUrl}${pathname}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as JsonRecord & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || `Backend AI request failed with ${response.status}.`);
  }

  return payload;
}

async function createGuidanceWithBackendFallback(sessionId: string, meeting: unknown, transcriptSegments: JsonRecord[]) {
  try {
    return await requestBackendAi("/api/ai/live-guidance", {
      sessionId,
      meeting,
      transcriptSegments,
    });
  } catch (error) {
    console.warn("Claude live guidance unavailable, using fallback:", error);
    return createGuidance(sessionId, transcriptSegments);
  }
}

async function createAnalysisWithBackendFallback(sessionId: string, meeting: unknown, transcriptSegments: JsonRecord[]) {
  if (!transcriptSegments.length) {
    return {
      analysis: createAnalysis(sessionId, meeting as JsonRecord | undefined),
      error: "Transcript is not available yet. Generated fallback analysis from meeting context only.",
    };
  }

  try {
    return {
      analysis: await requestBackendAi("/api/ai/analyze-session", {
        sessionId,
        meeting,
        transcriptSegments,
      }),
      error: undefined,
    };
  } catch (error) {
    console.warn("Claude final analysis unavailable, using fallback:", error);
    return {
      analysis: createAnalysis(sessionId, meeting as JsonRecord | undefined),
      error: error instanceof Error ? error.message : "Claude final analysis failed. Generated fallback analysis.",
    };
  }
}

async function analyzeSessionInWorkspace(sessionId: string) {
  const workspace = await loadWorkspace();
  const { meeting, session, transcriptSegments } = getSessionContext(workspace, sessionId);
  const result = await createAnalysisWithBackendFallback(sessionId, meeting, transcriptSegments);
  const analysis = result.analysis;

  return saveWorkspace({
    ...workspace,
    analyses: [analysis, ...workspace.analyses.filter((item: JsonRecord) => item.sessionId !== sessionId)],
    sessions: workspace.sessions.map((item: JsonRecord) =>
      item.id === sessionId ? { ...item, status: "analyzed", analysisId: analysis.id, analysisError: result.error } : item,
    ),
    meetings: workspace.meetings.map((item: JsonRecord) =>
      item.id === session?.meetingId ? { ...item, status: "analyzed" } : item,
    ),
    usageEvents: [...workspace.usageEvents, createUsageEvent("final_ai", 1, sessionId)],
  });
}

async function updateSessionFields(sessionId: string, patch: JsonRecord) {
  const workspace = await loadWorkspace();

  return saveWorkspace({
    ...workspace,
    sessions: workspace.sessions.map((session: JsonRecord) => (session.id === sessionId ? { ...session, ...patch } : session)),
  });
}

async function processRecallTranscriptAfterStop(sessionId: string) {
  const backendApiBaseUrl = getBackendApiBaseUrl();

  if (!backendApiBaseUrl) {
    await updateSessionFields(sessionId, {
      transcriptFetchStatus: "failed",
      transcriptFetchError: "TAPLO_API_BASE_URL is not configured, so Recall transcript retrieval is unavailable.",
    });
    return;
  }

  const workspace = await loadWorkspace();
  const session = workspace.sessions.find((item: JsonRecord) => item.id === sessionId);

  if (!session || session.recordingMode !== "recall" || typeof session.recallUploadId !== "string") {
    return;
  }

  await updateSessionFields(sessionId, {
    transcriptFetchStatus: "fetching",
    transcriptFetchError: undefined,
  });

  try {
    const result = await fetchRecallSessionTranscript({
      backendApiBaseUrl,
      recallUploadId: session.recallUploadId,
      recordingId: typeof session.externalRecordingId === "string" ? session.externalRecordingId : undefined,
    });
    const transcriptSegments = result.segments.map((segment) => ({
      id: randomUUID(),
      sessionId,
      speaker: segment.speaker,
      text: segment.text,
      startMs: segment.startMs,
      endMs: segment.endMs,
      final: true,
    }));
    const latestWorkspace = await loadWorkspace();

    await saveWorkspace({
      ...latestWorkspace,
      transcriptSegments: [...latestWorkspace.transcriptSegments, ...transcriptSegments],
      sessions: latestWorkspace.sessions.map((item: JsonRecord) =>
        item.id === sessionId
          ? {
              ...item,
              externalRecordingId: result.recordingId,
              transcriptSegmentIds: transcriptSegments.map((segment) => segment.id),
              transcriptFetchStatus: "ready",
              transcriptFetchError: undefined,
            }
          : item,
      ),
    });

    await analyzeSessionInWorkspace(sessionId);
  } catch (error) {
    console.error("Recall transcript fetch failed:", error);
    await updateSessionFields(sessionId, {
      transcriptFetchStatus: "failed",
      transcriptFetchError: error instanceof Error ? error.message : "Recall transcript fetch failed.",
    });
  }
}

function registerIpc() {
  ipcMain.handle("workspace:load", () => loadWorkspace());
  ipcMain.handle("workspace:save", (_event, workspace) => saveWorkspace(workspace));
  ipcMain.handle("workspace:addMeeting", async (_event, meeting) => {
    const workspace = await loadWorkspace();
    return saveWorkspace({
      ...workspace,
      meetings: [meeting, ...workspace.meetings],
    });
  });

  ipcMain.handle("workspace:updateMeeting", async (_event, meetingId: string, patch: JsonRecord) => {
    const workspace = await loadWorkspace();
    const allowedKeys = ["candidateName", "roleTitle", "jobDescription", "candidateCv", "recruiterNotes"] as const;
    const safePatch = Object.fromEntries(
      allowedKeys.filter((key) => typeof patch[key] === "string").map((key) => [key, patch[key]]),
    );

    return saveWorkspace({
      ...workspace,
      meetings: workspace.meetings.map((meeting: JsonRecord) =>
        meeting.id === meetingId ? { ...meeting, ...safePatch } : meeting,
      ),
    });
  });

  ipcMain.handle("recording:start", async (_event, meetingId: string) => {
    const workspace = await loadWorkspace();
    const existingSession = workspace.sessions.find(
      (session: JsonRecord) => session.meetingId === meetingId && (session.status === "recording" || session.status === "paused"),
    );

    if (existingSession) {
      return { workspace, session: existingSession };
    }

    const session = {
      id: randomUUID(),
      meetingId,
      startedAt: new Date().toISOString(),
      durationSeconds: 0,
      status: "recording",
      transcriptSegmentIds: [],
      liveGuidance: [],
    };
    let recordingMetadata: JsonRecord = { recordingMode: "mock" };
    const backendApiBaseUrl = getBackendApiBaseUrl();

    if (backendApiBaseUrl) {
      try {
        const recallRecording = await recallRecorder.start({
          sessionId: session.id,
          meetingId,
          backendApiBaseUrl,
        });
        recordingMetadata = {
          recordingMode: recallRecording.mode,
          recallUploadId: recallRecording.recallUploadId,
          externalRecordingId: recallRecording.externalRecordingId,
          recallWindowId: recallRecording.recallWindowId,
          recallApiBaseUrl: recallRecording.recallApiBaseUrl,
          recordingError: undefined,
        };
      } catch (error) {
        recordingMetadata = {
          recordingMode: "mock",
          recordingError: error instanceof Error ? error.message : "Recall Desktop SDK recording failed to start. Mock recording is active.",
        };
      }
    }

    const sessionWithMetadata = {
      ...session,
      ...recordingMetadata,
    };
    const nextWorkspace = await saveWorkspace({
      ...workspace,
      sessions: [sessionWithMetadata, ...workspace.sessions],
      meetings: workspace.meetings.map((meeting: JsonRecord) =>
        meeting.id === meetingId ? { ...meeting, status: "recorded" } : meeting,
      ),
      meetingPanelStates: [
        {
          meetingId,
          sessionId: sessionWithMetadata.id,
          status: "open",
          openedAt: new Date().toISOString(),
        },
        ...workspace.meetingPanelStates.filter((state: JsonRecord) => state.meetingId !== meetingId),
      ],
    });

    return { workspace: nextWorkspace, session: sessionWithMetadata };
  });

  ipcMain.handle("recording:pause", async (_event, sessionId: string) => {
    const workspace = await loadWorkspace();
    let updatedSession: JsonRecord | undefined;
    const currentSession = workspace.sessions.find((session: JsonRecord) => session.id === sessionId);

    if (currentSession?.recordingMode === "recall") {
      try {
        await recallRecorder.pause(sessionId);
      } catch (error) {
        console.error("Recall Desktop SDK pause failed:", error);
      }
    }

    const sessions = workspace.sessions.map((session: JsonRecord) => {
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

    const nextWorkspace = await saveWorkspace({ ...workspace, sessions });
    return { workspace: nextWorkspace, session: updatedSession };
  });

  ipcMain.handle("recording:resume", async (_event, sessionId: string) => {
    const workspace = await loadWorkspace();
    let updatedSession: JsonRecord | undefined;
    const currentSession = workspace.sessions.find((session: JsonRecord) => session.id === sessionId);

    if (currentSession?.recordingMode === "recall") {
      try {
        await recallRecorder.resume(sessionId);
      } catch (error) {
        console.error("Recall Desktop SDK resume failed:", error);
      }
    }

    const sessions = workspace.sessions.map((session: JsonRecord) => {
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

    const nextWorkspace = await saveWorkspace({ ...workspace, sessions });
    return { workspace: nextWorkspace, session: updatedSession };
  });

  ipcMain.handle("recording:stop", async (_event, sessionId: string) => {
    const workspace = await loadWorkspace();
    const endedAt = new Date();
    let updatedSession: JsonRecord | undefined;
    let recordingStopMetadata: JsonRecord = {};
    let recordingError: string | undefined;
    const currentSession = workspace.sessions.find((session: JsonRecord) => session.id === sessionId);
    const isRecallRecording = currentSession?.recordingMode === "recall" && typeof currentSession.recallWindowId === "string";

    if (isRecallRecording) {
      try {
        const stoppedRecording = await recallRecorder.stop(sessionId);
        recordingStopMetadata = stoppedRecording
          ? {
              recordingMode: stoppedRecording.mode,
              recallUploadId: stoppedRecording.recallUploadId,
              externalRecordingId: stoppedRecording.externalRecordingId,
              recallWindowId: stoppedRecording.recallWindowId,
            }
          : {};
      } catch (error) {
        recordingError = error instanceof Error ? error.message : "Recall Desktop SDK recording failed to stop cleanly.";
      }
    }

    const transcriptSegments = isRecallRecording ? [] : createMockTranscript(sessionId);
    const sessions = workspace.sessions.map((session: JsonRecord) => {
      if (session.id !== sessionId) {
        return session;
      }

      const durationSeconds = Math.max(1, Math.round((endedAt.getTime() - new Date(String(session.startedAt)).getTime()) / 1000));
      updatedSession = {
        ...session,
        ...recordingStopMetadata,
        endedAt: endedAt.toISOString(),
        durationSeconds,
        status: "stopped",
        transcriptSegmentIds: transcriptSegments.map((segment) => segment.id),
        recordingError: recordingError ?? session.recordingError,
        ...(isRecallRecording
          ? {
              transcriptFetchStatus: "fetching",
              transcriptFetchError: undefined,
            }
          : {}),
      };
      return updatedSession;
    });

    const nextWorkspace = await saveWorkspace({
      ...workspace,
      sessions,
      transcriptSegments: [...workspace.transcriptSegments, ...transcriptSegments],
      usageEvents: [...workspace.usageEvents, createUsageEvent("recording", Number(updatedSession?.durationSeconds ?? 0), sessionId)],
      meetingPanelStates: updatedSession?.meetingId
        ? [
            {
              meetingId: updatedSession.meetingId,
              sessionId,
              status: "completed",
              completedAt: new Date().toISOString(),
            },
            ...workspace.meetingPanelStates.filter((state: JsonRecord) => state.meetingId !== updatedSession?.meetingId),
          ]
        : workspace.meetingPanelStates,
    });

    if (isRecallRecording && typeof updatedSession?.recallUploadId === "string") {
      void processRecallTranscriptAfterStop(sessionId);
    }

    return { workspace: nextWorkspace, session: updatedSession, transcriptSegments };
  });

  ipcMain.handle("ai:liveGuidance", async (_event, sessionId: string) => {
    const workspace = await loadWorkspace();
    const { meeting, transcriptSegments } = getSessionContext(workspace, sessionId);
    const guidance = await createGuidanceWithBackendFallback(sessionId, meeting, transcriptSegments);
    const nextWorkspace = await saveWorkspace({
      ...workspace,
      sessions: workspace.sessions.map((session: JsonRecord) =>
        session.id === sessionId ? { ...session, liveGuidance: [guidance, ...((session.liveGuidance as JsonRecord[]) ?? [])] } : session,
      ),
      usageEvents: [...workspace.usageEvents, createUsageEvent("live_ai", 1, sessionId)],
    });

    return { workspace: nextWorkspace, guidance };
  });

  ipcMain.handle("ai:analyze", async (_event, sessionId: string) => {
    const nextWorkspace = await analyzeSessionInWorkspace(sessionId);
    const analysis = nextWorkspace.analyses.find((item: JsonRecord) => item.sessionId === sessionId);

    return { workspace: nextWorkspace, analysis };
  });

  ipcMain.handle("calendar:connect", async (_event, provider: string) => {
    if (!isCalendarProvider(provider)) {
      throw new Error("Unsupported calendar provider.");
    }

    const workspace = await loadWorkspace();
    const backendApiBaseUrl = getBackendApiBaseUrl();

    if (backendApiBaseUrl) {
      await shell.openExternal(`${backendApiBaseUrl}/api/calendar/connect/${provider}`);
      return saveWorkspace(
        withCalendarStatus(workspace, provider, "connecting", {
          syncStatus: "idle",
          syncError: undefined,
        }),
      );
    }

    const config = getRecallCalendarConfig();

    if (!hasProviderCredentials(config, provider)) {
      return saveWorkspace(
        withCalendarStatus(workspace, provider, "error", {
          syncStatus: "mock",
          syncError: `Missing Recall API key or ${provider} OAuth credentials. Mock sync remains available.`,
        }),
      );
    }

    const pending = createOAuthState(provider);
    pendingOAuthStates.set(pending.state, pending);
    await shell.openExternal(buildProviderAuthUrl(config, provider, pending.state));

    return saveWorkspace(
      withCalendarStatus(workspace, provider, "connecting", {
        syncStatus: "idle",
        syncError: undefined,
      }),
    );
  });

  ipcMain.handle("calendar:disconnect", async (_event, connectionId: string) => {
    const workspace = await loadWorkspace();
    return saveWorkspace({
      ...workspace,
      calendarConnections: workspace.calendarConnections.map((connection: JsonRecord) =>
        connection.id === connectionId ? { ...connection, status: "disconnected" } : connection,
      ),
    });
  });

  ipcMain.handle("calendar:sync", async () => {
    const workspace = await loadWorkspace();
    const backendApiBaseUrl = getBackendApiBaseUrl();
    const nextWorkspace = backendApiBaseUrl
      ? await syncCalendarViaBackend(workspace, backendApiBaseUrl)
      : await syncRecallCalendarV2(workspace);

    void runReminderCheck();
    return nextWorkspace;
  });

  ipcMain.handle("panel:openJoinUrl", async (_event, meetingId: string) => {
    const workspace = await loadWorkspace();
    const meeting = workspace.meetings.find((item: JsonRecord) => item.id === meetingId);
    const joinUrl = meeting?.joinUrl;

    if (typeof joinUrl === "string" && joinUrl) {
      await shell.openExternal(joinUrl);
    }
  });

  ipcMain.handle("panel:open", async (_event, meetingId: string) => {
    await createPanelWindow(meetingId);
  });

  ipcMain.handle("panel:confirmConsent", async (_event, meetingId: string) => {
    const workspace = await loadWorkspace();
    return saveWorkspace({
      ...workspace,
      meetings: workspace.meetings.map((meeting: JsonRecord) =>
        meeting.id === meetingId
          ? {
              ...meeting,
              consentConfirmedAt: new Date().toISOString(),
              consentConfirmedBy: "Recruiter",
            }
          : meeting,
      ),
    });
  });

  ipcMain.handle("panel:dismiss", async (_event, meetingId: string) => {
    const workspace = await loadWorkspace();
    const dismissedAt = new Date().toISOString();
    const nextWorkspace = await saveWorkspace({
      ...workspace,
      meetings: workspace.meetings.map((meeting: JsonRecord) =>
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
        ...workspace.meetingPanelStates.filter((state: JsonRecord) => state.meetingId !== meetingId),
      ],
    });

    if (panelWindow && !panelWindow.isDestroyed()) {
      panelWindow.close();
    }

    return nextWorkspace;
  });
}

app.whenReady().then(async () => {
  await getDb();
  void recallRecorder.initialize().catch((error) => {
    console.warn("Recall Desktop SDK initialization deferred:", error);
  });
  registerCalendarDeepLinks();
  registerIpc();
  await createWindow();
  startReminderScheduler();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
