"use client";

import {
  BarChart3,
  Bot,
  Calendar,
  Copy,
  FileText,
  Mail,
  Plug,
  Settings,
  UserRound,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { createWorkspaceStore } from "@/lib/workspace/electron-store";
import { summarizeUsage } from "@/lib/usage/costs";
import type { AnalysisOutput, CalendarProvider, Meeting, Session, WorkspaceData } from "@/lib/workspace/types";
import type { UpdateMeetingInput } from "@/lib/workspace/store";
import { createEmptyWorkspace } from "@/lib/workspace/default-data";

type Screen = "dashboard" | "meetings" | "analysis" | "usage" | "settings";

const screens: Array<{ id: Screen; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "meetings", label: "Meetings", icon: Calendar },
  { id: "analysis", label: "Analysis", icon: FileText },
  { id: "usage", label: "Usage", icon: Bot },
  { id: "settings", label: "Settings", icon: Settings },
];

const initialMeetingForm = {
  candidateName: "",
  roleTitle: "",
  scheduledAt: "",
  joinUrl: "",
  jobDescription: "",
  candidateCv: "",
  recruiterNotes: "",
};

export default function Home() {
  const [activeScreen, setActiveScreen] = useState<Screen>("dashboard");
  const [workspace, setWorkspace] = useState<WorkspaceData>(() => createEmptyWorkspace());
  const [selectedMeetingId, setSelectedMeetingId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [meetingForm, setMeetingForm] = useState(initialMeetingForm);
  const [busy, setBusy] = useState<string | null>(null);

  const store = useMemo(() => createWorkspaceStore(), []);
  const usage = useMemo(() => summarizeUsage(workspace), [workspace]);
  const linkableMeetings = useMemo(() => workspace.meetings.filter(hasMeetingLink), [workspace.meetings]);
  const upcomingMeetings = useMemo(() => getUpcomingMeetings(linkableMeetings), [linkableMeetings]);
  const todaysMeetings = useMemo(() => getTodaysUpcomingMeetings(upcomingMeetings), [upcomingMeetings]);
  const laterMeetings = useMemo(() => upcomingMeetings.filter((meeting) => !isToday(meeting.scheduledAt)), [upcomingMeetings]);
  const selectedMeeting = upcomingMeetings.find((meeting) => meeting.id === selectedMeetingId) ?? upcomingMeetings[0];
  const selectedSession = workspace.sessions.find((session) => session.id === selectedSessionId) ?? workspace.sessions[0];
  const selectedAnalysis = workspace.analyses.find((analysis) => analysis.sessionId === selectedSession?.id) ?? workspace.analyses[0];

  useEffect(() => {
    let cancelled = false;

    void store.load().then((nextWorkspace) => {
      if (cancelled) {
        return;
      }

      setWorkspace(nextWorkspace);
      const nextUpcomingMeetings = getUpcomingMeetings(nextWorkspace.meetings.filter(hasMeetingLink));
      setSelectedMeetingId((current) => current || nextUpcomingMeetings[0]?.id || "");
      setSelectedSessionId((current) => current || nextWorkspace.sessions[0]?.id || "");
    });

    return () => {
      cancelled = true;
    };
  }, [store]);

  const updateMeetingForm = useCallback((field: keyof typeof initialMeetingForm, value: string) => {
    setMeetingForm((current) => ({ ...current, [field]: value }));
  }, []);

  const addMeeting = useCallback(async () => {
    if (!meetingForm.candidateName.trim() || !meetingForm.roleTitle.trim()) {
      return;
    }

    setBusy("Adding meeting");
    const meeting: Meeting = {
      id: crypto.randomUUID(),
      source: "manual",
      candidateName: meetingForm.candidateName,
      roleTitle: meetingForm.roleTitle,
      scheduledAt: meetingForm.scheduledAt ? new Date(meetingForm.scheduledAt).toISOString() : new Date().toISOString(),
      jobDescription: meetingForm.jobDescription,
      candidateCv: meetingForm.candidateCv,
      recruiterNotes: meetingForm.recruiterNotes,
      joinUrl: meetingForm.joinUrl,
      status: "upcoming",
    };
    const nextWorkspace = await store.addMeeting(meeting);
    setWorkspace(nextWorkspace);
    setSelectedMeetingId(meeting.id);
    setMeetingForm(initialMeetingForm);
    setBusy(null);
  }, [meetingForm, store]);

  const connectCalendar = useCallback(
    async (provider: CalendarProvider) => {
      setBusy(`Connecting ${provider}`);
      setWorkspace(await store.connectCalendar({ provider }));
      setBusy(null);
    },
    [store],
  );

  const syncCalendar = useCallback(async () => {
    setBusy("Syncing calendar");
    const nextWorkspace = await store.syncCalendar();
    const nextUpcomingMeetings = getUpcomingMeetings(nextWorkspace.meetings.filter(hasMeetingLink));
    setWorkspace(nextWorkspace);
    setSelectedMeetingId(nextUpcomingMeetings[0]?.id || "");
    setBusy(null);
  }, [store]);

  const disconnectCalendar = useCallback(
    async (connectionId: string) => {
      setWorkspace(await store.disconnectCalendar(connectionId));
    },
    [store],
  );

  const joinMeeting = useCallback(
    async (meetingId: string) => {
      setBusy("Opening meeting");
      await store.openMeetingJoinUrl(meetingId);
      setBusy(null);
    },
    [store],
  );

  const openPanel = useCallback(
    async (meetingId: string) => {
      setBusy("Opening panel");
      await store.openMeetingPanel(meetingId);
      setBusy(null);
    },
    [store],
  );

  const saveMeetingContext = useCallback(
    async (meetingId: string, patch: UpdateMeetingInput["patch"]) => {
      setBusy("Saving interview context");
      setWorkspace(await store.updateMeeting({ meetingId, patch }));
      setBusy(null);
    },
    [store],
  );

  return (
    <main className="min-h-screen px-6 py-6 text-[var(--foreground)]">
      <div className="mx-auto flex max-w-7xl gap-6">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col rounded-[2rem] border border-[var(--border)] bg-[var(--card)]/90 p-4 shadow-[var(--shadow-soft)] backdrop-blur lg:flex">
          <div className="mb-8 px-2 pt-2">
            {/* Plain img keeps the logo reliable in the static Electron export. */}
            <img src="/taplo-logo-full-color.png" alt="Taplo" className="h-auto w-40" />
            <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">Interview intelligence</p>
          </div>
          <nav className="space-y-1">
            {screens.map((screen) => {
              const Icon = screen.icon;
              return (
                <button
                  key={screen.id}
                  onClick={() => setActiveScreen(screen.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${
                    activeScreen === screen.id
                      ? "bg-[var(--primary)]/10 text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]/70 hover:text-[var(--foreground)]"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${activeScreen === screen.id ? "text-[var(--primary)]" : ""}`} />
                  {screen.label}
                  {screen.id === "meetings" && upcomingMeetings.length > 0 && (
                    <span className="ml-auto rounded-full bg-[var(--primary)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--primary-foreground)]">
                      {upcomingMeetings.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          <div className="mt-auto rounded-3xl bg-[var(--muted)]/70 p-4 text-sm">
            <p className="font-bold">Platform-owned keys</p>
            <p className="mt-1 text-[var(--muted-foreground)]">OpenAI and Recall credentials stay behind desktop services.</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
              </p>
              <h2 className="mt-2 text-4xl font-bold capitalize tracking-tight">{activeScreen}</h2>
            </div>
            <div className="rounded-full border border-[var(--border)] bg-[var(--card)]/90 px-4 py-2 text-sm font-semibold shadow-[var(--shadow-soft)]">
              {busy ?? "Ready"}
            </div>
          </header>

          {activeScreen === "dashboard" && (
            <Dashboard
              workspace={workspace}
              todaysMeetings={todaysMeetings}
              laterMeetings={laterMeetings}
              onJoinMeeting={joinMeeting}
              onOpenPanel={openPanel}
              onMeetings={() => setActiveScreen("meetings")}
            />
          )}
          {activeScreen === "meetings" && (
            <MeetingsScreen
              form={meetingForm}
              meetings={todaysMeetings}
              laterMeetings={laterMeetings}
              selectedMeeting={workspace.meetings.find((meeting) => meeting.id === selectedMeetingId)}
              onChange={updateMeetingForm}
              onAdd={addMeeting}
              onSelect={setSelectedMeetingId}
              onJoinMeeting={joinMeeting}
              onOpenPanel={openPanel}
              onSync={syncCalendar}
              onSaveContext={saveMeetingContext}
            />
          )}
          {activeScreen === "analysis" && <AnalysisScreen analysis={selectedAnalysis} sessions={workspace.sessions} onSelect={setSelectedSessionId} />}
          {activeScreen === "usage" && <UsageScreen usage={usage} />}
          {activeScreen === "settings" && (
            <SettingsScreen
              connections={workspace.calendarConnections}
              meetings={workspace.meetings}
              onConnect={connectCalendar}
              onDisconnect={disconnectCalendar}
              onSync={syncCalendar}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function Dashboard({
  workspace,
  todaysMeetings,
  laterMeetings,
  onJoinMeeting,
  onOpenPanel,
  onMeetings,
}: {
  workspace: WorkspaceData;
  todaysMeetings: Meeting[];
  laterMeetings: Meeting[];
  onJoinMeeting: (meetingId: string) => void;
  onOpenPanel: (meetingId: string) => void;
  onMeetings: () => void;
}) {
  const latestMeetings = todaysMeetings.slice(0, 3);
  const nextMeeting = todaysMeetings[0] ?? laterMeetings[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Sessions" value={workspace.sessions.length.toString()} />
        <Metric label="Today" value={todaysMeetings.length.toString()} />
        <Metric label="Analyses" value={workspace.analyses.length.toString()} />
      </div>
      <div className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-[var(--shadow-float)]">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--primary)]">Desktop interview desk</p>
          <h3 className="mt-3 text-3xl font-bold tracking-tight">Your calendar-driven interview workspace.</h3>
        </div>
        <p className="mt-3 max-w-2xl text-[var(--muted-foreground)]">
          Sync upcoming meetings, add job context, and use the reminder panel to join calls, confirm consent, and record interviews.
        </p>
        <button onClick={onMeetings} className="mt-6 rounded-full bg-[var(--primary)] px-5 py-3 font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-soft)] hover:opacity-90">
          Manage meetings
        </button>
      </div>
      <Card title="Today's meetings">
        <div className="grid gap-3">
          {latestMeetings.length ? (
            latestMeetings.map((meeting) => <MeetingRow key={meeting.id} meeting={meeting} onJoin={onJoinMeeting} onOpenPanel={onOpenPanel} />)
          ) : (
            <EmptyState
              text={
                nextMeeting
                  ? `No meetings scheduled for today. Next synced meeting is ${nextMeeting.candidateName} on ${new Date(nextMeeting.scheduledAt).toLocaleString()}.`
                  : "No meetings scheduled for today. Add one manually or sync your calendar."
              }
            />
          )}
        </div>
      </Card>
      {laterMeetings.length > 0 && (
        <Card title="Upcoming reminders">
          <div className="grid gap-3">
            {laterMeetings.slice(0, 4).map((meeting) => (
              <MeetingRow key={meeting.id} meeting={meeting} onJoin={onJoinMeeting} onOpenPanel={onOpenPanel} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function MeetingsScreen({
  form,
  meetings,
  laterMeetings,
  selectedMeeting,
  onChange,
  onAdd,
  onSelect,
  onJoinMeeting,
  onOpenPanel,
  onSync,
  onSaveContext,
}: {
  form: typeof initialMeetingForm;
  meetings: Meeting[];
  laterMeetings: Meeting[];
  selectedMeeting?: Meeting;
  onChange: (field: keyof typeof initialMeetingForm, value: string) => void;
  onAdd: () => void;
  onSelect: (id: string) => void;
  onJoinMeeting: (meetingId: string) => void;
  onOpenPanel: (meetingId: string) => void;
  onSync: () => void;
  onSaveContext: (meetingId: string, patch: UpdateMeetingInput["patch"]) => Promise<void>;
}) {
  const selectedMeetingId = selectedMeeting?.id;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.15fr]">
      <Card title="Add meeting manually">
        <div className="grid gap-3">
          <Input label="Candidate name" value={form.candidateName} onChange={(value) => onChange("candidateName", value)} />
          <Input label="Role title" value={form.roleTitle} onChange={(value) => onChange("roleTitle", value)} />
          <Input label="Scheduled time" type="datetime-local" value={form.scheduledAt} onChange={(value) => onChange("scheduledAt", value)} />
          <Input label="Meeting join URL" value={form.joinUrl} onChange={(value) => onChange("joinUrl", value)} />
          <TextArea label="Job description" value={form.jobDescription} onChange={(value) => onChange("jobDescription", value)} />
          <TextArea label="Candidate CV" value={form.candidateCv} onChange={(value) => onChange("candidateCv", value)} />
          <TextArea label="Recruiter notes" value={form.recruiterNotes} onChange={(value) => onChange("recruiterNotes", value)} />
          <button onClick={onAdd} className="rounded-full bg-[var(--primary)] px-4 py-3 font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-soft)] hover:opacity-90">
            Add meeting
          </button>
        </div>
      </Card>
      <div className="grid gap-6">
      <Card
        title="Today's meetings"
        action={
          <button onClick={onSync} className="rounded-full bg-[var(--primary)]/10 px-3 py-2 text-sm font-bold text-[var(--primary)]">
            Sync calendar
          </button>
        }
      >
        <div className="grid gap-3">
          {meetings.length ? (
            meetings.map((meeting) => (
              <button
                key={meeting.id}
                onClick={() => onSelect(meeting.id)}
                className={`rounded-3xl border p-4 text-left transition ${
                  selectedMeetingId === meeting.id
                    ? "border-[var(--primary)]/40 bg-[var(--card)] shadow-[var(--shadow-soft)]"
                    : "border-[var(--border)] bg-[var(--card)]/70 hover:bg-[var(--card)]"
                }`}
              >
                <MeetingRow meeting={meeting} onJoin={onJoinMeeting} onOpenPanel={onOpenPanel} />
              </button>
            ))
          ) : (
            <EmptyState text="No upcoming meetings with join links for today. Sync your calendar to pull interview events that include a meeting URL." />
          )}
        </div>
        {laterMeetings.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-bold">Upcoming later</h4>
              <span className="rounded-full bg-[var(--muted)] px-2 py-1 text-xs font-bold text-[var(--muted-foreground)]">
                {laterMeetings.length} stored
              </span>
            </div>
            <div className="grid gap-3">
              {laterMeetings.map((meeting) => (
                <button
                  key={meeting.id}
                  onClick={() => onSelect(meeting.id)}
                  className={`rounded-3xl border p-4 text-left transition ${
                    selectedMeetingId === meeting.id
                      ? "border-[var(--primary)]/40 bg-[var(--card)] shadow-[var(--shadow-soft)]"
                      : "border-[var(--border)] bg-[var(--card)]/70 hover:bg-[var(--card)]"
                  }`}
                >
                  <MeetingRow meeting={meeting} onJoin={onJoinMeeting} onOpenPanel={onOpenPanel} />
                </button>
              ))}
            </div>
          </div>
        )}
        <p className="mt-4 text-xs leading-5 text-[var(--muted-foreground)]">
          Optional: paste the job description in your Google Calendar event description to pre-fill on first sync.
        </p>
      </Card>
      {selectedMeeting && (
        <InterviewContextCard meeting={selectedMeeting} onSave={(patch) => onSaveContext(selectedMeeting.id, patch)} />
      )}
      </div>
    </div>
  );
}

function InterviewContextCard({
  meeting,
  onSave,
}: {
  meeting: Meeting;
  onSave: (patch: UpdateMeetingInput["patch"]) => Promise<void>;
}) {
  const [roleTitle, setRoleTitle] = useState(meeting.roleTitle);
  const [jobDescription, setJobDescription] = useState(meeting.jobDescription);
  const [candidateCv, setCandidateCv] = useState(meeting.candidateCv);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRoleTitle(meeting.roleTitle);
    setJobDescription(meeting.jobDescription);
    setCandidateCv(meeting.candidateCv);
  }, [meeting.id, meeting.roleTitle, meeting.jobDescription, meeting.candidateCv]);

  return (
    <Card title="Interview context">
      <p className="mb-3 text-sm text-[var(--muted-foreground)]">
        Paste the job description for {meeting.candidateName}. Analysis and live insights use this context with the interview transcript.
      </p>
      <div className="grid gap-3">
        <Input label="Role title" value={roleTitle} onChange={setRoleTitle} />
        <TextArea label="Job description" value={jobDescription} onChange={setJobDescription} />
        <TextArea label="Candidate CV (optional)" value={candidateCv} onChange={setCandidateCv} />
        <button
          disabled={saving}
          onClick={() => {
            setSaving(true);
            void onSave({ roleTitle, jobDescription, candidateCv }).finally(() => setSaving(false));
          }}
          className="rounded-full bg-[var(--primary)] px-4 py-3 font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-soft)] hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save interview context"}
        </button>
      </div>
    </Card>
  );
}

function AnalysisScreen({ analysis, sessions, onSelect }: { analysis?: AnalysisOutput; sessions: Session[]; onSelect: (id: string) => void }) {
  if (!analysis) {
    return (
      <Card title="Analysis">
        <EmptyState text="Analyze a stopped recording to generate candidate notes and drafts." />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Select session">
        <select onChange={(event) => onSelect(event.target.value)} value={analysis.sessionId} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 outline-none focus:border-[var(--primary)]">
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {new Date(session.startedAt).toLocaleString()} - {session.status}
            </option>
          ))}
        </select>
      </Card>
      <Card title="Candidate summary">
        <p className="text-lg leading-8 text-[var(--muted-foreground)]">{analysis.candidateSummary}</p>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <EvidenceCard title="Experience signals" items={analysis.experienceSignals} />
        <EvidenceCard title="Technical signals" items={analysis.technicalSignals} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ListCard title="Communication observations" items={analysis.communicationObservations} />
        <ListCard title="Concerns and missing info" items={analysis.concernsAndMissingInfo} />
      </div>
      <DraftCard icon={FileText} title="Client submission draft" text={analysis.clientSubmissionDraft} />
      <DraftCard icon={Mail} title="Follow-up email draft" text={analysis.followUpEmailDraft} />
      <DraftCard icon={UserRound} title="Internal recruiter notes" text={analysis.internalRecruiterNotes} />
    </div>
  );
}

function UsageScreen({ usage }: { usage: ReturnType<typeof summarizeUsage> }) {
  return (
    <div className="space-y-6">
      <Card title="Interview hours">
        <div className="rounded-[2rem] bg-[var(--muted)]/40 p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Recorded interview time</p>
          <p className="mt-4 text-6xl font-bold tracking-tight">{usage.totalHoursRecorded.toFixed(2)}</p>
          <p className="mt-2 text-sm font-semibold text-[var(--muted-foreground)]">hours</p>
        </div>
      </Card>
    </div>
  );
}

function SettingsScreen({
  connections,
  meetings,
  onConnect,
  onDisconnect,
  onSync,
}: {
  connections: WorkspaceData["calendarConnections"];
  meetings: Meeting[];
  onConnect: (provider: CalendarProvider) => void;
  onDisconnect: (connectionId: string) => void;
  onSync: () => void;
}) {
  const upcomingWithJoinLinks = meetings.filter((meeting) => meeting.status === "upcoming" && meeting.joinUrl).length;
  const lastSyncedAt = connections
    .map((connection) => connection.lastSyncedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <div className="space-y-6">
      <Card title="Calendar connections">
        <div className="flex flex-wrap gap-3">
          <button onClick={() => onConnect("google")} className="rounded-full bg-[var(--primary)] px-4 py-3 font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-soft)]">
            <Plug className="mr-2 inline h-4 w-4" />
            Connect Google
          </button>
          <button onClick={() => onConnect("outlook")} className="rounded-full bg-[var(--primary)] px-4 py-3 font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-soft)]">
            <Plug className="mr-2 inline h-4 w-4" />
            Connect Outlook
          </button>
          <button onClick={onSync} className="rounded-full bg-[var(--primary)]/10 px-4 py-3 font-bold text-[var(--primary)]">
            Sync meetings
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Metric label="Upcoming join links" value={upcomingWithJoinLinks.toString()} />
          <Metric label="Last sync" value={lastSyncedAt ? new Date(lastSyncedAt).toLocaleDateString() : "Never"} />
        </div>
        <div className="mt-5 grid gap-3">
          {connections.map((connection) => (
            <div key={connection.id} className="flex items-center justify-between rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div>
                <p className="font-bold capitalize">{connection.provider}</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {connection.email} - {connection.status}
                </p>
              </div>
              <button onClick={() => onDisconnect(connection.id)} className="rounded-full bg-[var(--muted)] px-3 py-2 text-sm font-bold">
                Disconnect
              </button>
            </div>
          ))}
          {!connections.length && <EmptyState text="Connect Google or Outlook to sync upcoming interviews." />}
        </div>
      </Card>
      <Card title="Sync diagnostics">
        <div className="grid gap-3">
          {connections.length ? (
            connections.map((connection) => (
              <div key={`diagnostic-${connection.id}`} className="rounded-3xl border border-[var(--border)] bg-[var(--muted)]/40 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold capitalize">{connection.provider}</p>
                  <span className="rounded-full bg-[var(--card)] px-2 py-1 text-xs font-bold uppercase text-[var(--muted-foreground)]">{connection.status}</span>
                  {connection.syncStatus && (
                    <span className="rounded-full bg-[var(--primary)]/10 px-2 py-1 text-xs font-bold uppercase text-[var(--primary)]">
                      {connection.syncStatus}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  Recall calendar: {connection.recallCalendarId ? shortenId(connection.recallCalendarId) : "not linked yet"}
                </p>
                {connection.lastSyncedAt && (
                  <p className="text-sm text-[var(--muted-foreground)]">Last synced {new Date(connection.lastSyncedAt).toLocaleString()}</p>
                )}
                {connection.syncError && <p className="mt-2 text-sm font-semibold text-red-700">{connection.syncError}</p>}
              </div>
            ))
          ) : (
            <EmptyState text="Connection diagnostics will appear after starting calendar setup." />
          )}
        </div>
      </Card>
      <Card title="Security model">
        <p className="text-[var(--muted-foreground)]">
          Users never paste OpenAI or Recall keys. Desktop services own credentials, launch OAuth in the system browser, and expose only typed app actions to the UI.
        </p>
      </Card>
    </div>
  );
}

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)]/90 p-6 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="text-xl font-bold tracking-tight">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)]/90 p-5 shadow-[var(--shadow-soft)]">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[var(--muted-foreground)]">
      {label}
      <input
        value={value}
        type={type}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--primary)]"
      />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[var(--muted-foreground)]">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="resize-none rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--primary)]"
      />
    </label>
  );
}

function MeetingRow({
  meeting,
  onJoin,
  onOpenPanel,
}: {
  meeting: Meeting;
  onJoin?: (meetingId: string) => void;
  onOpenPanel?: (meetingId: string) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold">{meeting.candidateName}</p>
          {meeting.status === "upcoming" && (
            <span className="rounded-full bg-[var(--muted)] px-2 py-1 text-xs font-bold uppercase text-[var(--muted-foreground)]">upcoming</span>
          )}
          {hasJobDescription(meeting) ? (
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold uppercase text-emerald-900">JD ready</span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold uppercase text-amber-900">JD missing</span>
          )}
        </div>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{meeting.roleTitle}</p>
        <p className="text-sm text-[var(--muted-foreground)]">{new Date(meeting.scheduledAt).toLocaleString()}</p>
        {meeting.calendarEventId && <p className="text-xs text-[var(--muted-foreground)]">Event {shortenId(meeting.calendarEventId)}</p>}
      </div>
      {((meeting.joinUrl && onJoin) || onOpenPanel) && (
        <div className="flex shrink-0 flex-col gap-2">
          {meeting.joinUrl && onJoin && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onJoin(meeting.id);
              }}
              className="rounded-full bg-[var(--primary)] px-3 py-2 text-xs font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-soft)] hover:opacity-90"
            >
              <Video className="mr-1 inline h-3.5 w-3.5" />
              Join
            </button>
          )}
          {onOpenPanel && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenPanel(meeting.id);
              }}
              className="rounded-full bg-[var(--muted)] px-3 py-2 text-xs font-bold text-[var(--muted-foreground)] hover:bg-[var(--border)]"
            >
              {meeting.joinUrl ? "Test panel" : "Open panel"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function shortenId(value: string) {
  return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}

function hasMeetingLink(meeting: Meeting) {
  return Boolean(meeting.joinUrl?.trim());
}

function hasJobDescription(meeting: Meeting) {
  return Boolean(meeting.jobDescription?.trim());
}

function getUpcomingMeetings(meetings: Meeting[]) {
  const now = Date.now();

  return meetings
    .filter((meeting) => meeting.status === "upcoming" && new Date(meeting.scheduledAt).getTime() >= now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

function getTodaysUpcomingMeetings(meetings: Meeting[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();

  return meetings
    .filter((meeting) => {
      const scheduledAt = new Date(meeting.scheduledAt).getTime();
      return meeting.status === "upcoming" && scheduledAt >= startOfToday && scheduledAt < startOfTomorrow;
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function EvidenceCard({ title, items }: { title: string; items: AnalysisOutput["experienceSignals"] }) {
  return (
    <Card title={title}>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-3xl bg-[var(--muted)]/40 p-4">
            <p className="font-bold">{item.label}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{item.evidence}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card title={title}>
      <ul className="list-disc space-y-2 pl-5 text-[var(--muted-foreground)]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Card>
  );
}

function DraftCard({ icon: Icon, title, text }: { icon: ComponentType<{ className?: string }>; title: string; text: string }) {
  return (
    <Card
      title={title}
      action={
        <button onClick={() => void navigator.clipboard.writeText(text)} className="rounded-full bg-[var(--muted)] px-3 py-2 text-sm font-bold">
          <Copy className="mr-2 inline h-4 w-4" />
          Copy
        </button>
      }
    >
      <div className="flex gap-4">
        <Icon className="mt-1 h-5 w-5 shrink-0 text-[var(--primary)]" />
        <p className="whitespace-pre-wrap leading-7 text-[var(--muted-foreground)]">{text}</p>
      </div>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--muted)]/40 p-6 text-center text-sm font-medium text-[var(--muted-foreground)]">{text}</div>;
}

