"use client";

import { ExternalLink, Mic, Pause, Play, ShieldCheck, Square, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { createWorkspaceStore } from "@/lib/workspace/electron-store";
import { createEmptyWorkspace } from "@/lib/workspace/default-data";
import type { AnalysisOutput, TranscriptSegment, WorkspaceData } from "@/lib/workspace/types";

export default function MeetingPanelPage() {
  const [workspace, setWorkspace] = useState<WorkspaceData>(() => createEmptyWorkspace());
  const [meetingId] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("meetingId") ?? "",
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "analyzing" | "ready" | "pending-transcript" | "error">("idle");
  const [analysisError, setAnalysisError] = useState("");
  const store = useMemo(() => createWorkspaceStore(), []);

  const meeting = workspace.meetings.find((item) => item.id === meetingId);
  const session = workspace.sessions.find(
    (item) => item.meetingId === meetingId && (item.status === "recording" || item.status === "paused"),
  ) ?? workspace.sessions.find((item) => item.meetingId === meetingId);
  const transcriptSegments = session
    ? workspace.transcriptSegments.filter((segment) => segment.sessionId === session.id).slice(-6)
    : [];
  const latestAnalysis = session ? workspace.analyses.find((analysis) => analysis.sessionId === session.id) : undefined;
  const consentConfirmed = Boolean(meeting?.consentConfirmedAt);
  const hasJobDescription = Boolean(meeting?.jobDescription?.trim());

  const load = useCallback(async () => {
    const nextWorkspace = await store.load();
    setWorkspace(nextWorkspace);
  }, [store]);

  useEffect(() => {
    let cancelled = false;

    void store.load().then((nextWorkspace) => {
      if (!cancelled) {
        setWorkspace(nextWorkspace);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [store]);

  useEffect(() => {
    if (!session || session.status !== "recording") {
      return;
    }

    const timer = window.setInterval(() => {
      void store.requestLiveGuidance(session.id).then((result) => setWorkspace(result.workspace));
    }, workspace.settings.liveGuidanceIntervalSeconds * 1000);

    return () => window.clearInterval(timer);
  }, [session, store, workspace.settings.liveGuidanceIntervalSeconds]);

  useEffect(() => {
    if (!session || session.recordingMode !== "recall" || session.status !== "stopped") {
      return;
    }

    const shouldPoll = session.transcriptFetchStatus === "fetching" || (!latestAnalysis && analysisStatus !== "ready");

    if (!shouldPoll) {
      return;
    }

    const timer = window.setInterval(() => {
      void store.load().then((nextWorkspace) => {
        setWorkspace(nextWorkspace);
        const currentSession = nextWorkspace.sessions.find((item) => item.id === session.id);
        const segments = nextWorkspace.transcriptSegments.filter((segment) => segment.sessionId === session.id);
        const analysis = nextWorkspace.analyses.find((item) => item.sessionId === session.id);

        if (analysis) {
          setAnalysisStatus("ready");
          setAnalysisError(currentSession?.analysisError ?? "");
          return;
        }

        if (currentSession?.transcriptFetchStatus === "failed") {
          setAnalysisStatus("error");
          setAnalysisError(currentSession.transcriptFetchError ?? "Recall transcript fetch failed.");
          return;
        }

        if (segments.length && currentSession?.transcriptFetchStatus === "ready") {
          setAnalysisStatus("analyzing");
        } else if (currentSession?.transcriptFetchStatus === "fetching") {
          setAnalysisStatus("pending-transcript");
        }
      });
    }, 4000);

    return () => window.clearInterval(timer);
  }, [analysisStatus, latestAnalysis, session, store]);

  const run = useCallback(
    async (label: string, action: () => Promise<WorkspaceData | { workspace: WorkspaceData } | void>) => {
      setBusy(label);
      const result = await action();

      if (result && "workspace" in result) {
        setWorkspace(result.workspace);
      } else if (result) {
        setWorkspace(result);
      } else {
        await load();
      }

      setBusy(null);
    },
    [load],
  );

  const analyzeStoppedSession = useCallback(
    async (sessionId: string, nextWorkspace: WorkspaceData) => {
      const availableTranscript = nextWorkspace.transcriptSegments.filter((segment) => segment.sessionId === sessionId);

      const currentSession = nextWorkspace.sessions.find((item) => item.id === sessionId);

      if (!availableTranscript.length) {
        if (currentSession?.recordingMode === "recall" && currentSession.transcriptFetchStatus === "fetching") {
          setAnalysisStatus("pending-transcript");
          return nextWorkspace;
        }

        setAnalysisStatus("pending-transcript");
        return nextWorkspace;
      }

      try {
        setAnalysisStatus("analyzing");
        setAnalysisError("");
        const result = await store.analyzeSession({ sessionId });
        setWorkspace(result.workspace);
        setAnalysisStatus("ready");
        return result.workspace;
      } catch (error) {
        setAnalysisStatus("error");
        setAnalysisError(error instanceof Error ? error.message : "Analysis failed.");
        return nextWorkspace;
      }
    },
    [store],
  );

  const stopAndAnalyze = useCallback(async () => {
    if (!session) {
      return;
    }

    setBusy("Stopping recording");
    const result = await store.stopRecording({ sessionId: session.id });
    setWorkspace(result.workspace);
    setBusy(null);
    await analyzeStoppedSession(session.id, result.workspace);
  }, [analyzeStoppedSession, session, store]);

  if (!meeting) {
    return (
      <main className="min-h-screen bg-[var(--background)] p-5 text-[var(--foreground)]">
        <PanelCard title="Meeting not found">
          <p className="text-sm text-[var(--muted-foreground)]">The meeting for this reminder panel is no longer available.</p>
        </PanelCard>
      </main>
    );
  }

  const latestGuidance = session?.liveGuidance[0];

  return (
    <main className="min-h-screen bg-[var(--background)] p-5 text-[var(--foreground)]">
      <div className="mx-auto max-w-md space-y-4">
        <header className="flex items-start justify-between gap-4">
          <div>
            {/* Plain img keeps the logo reliable in the static Electron export. */}
            <img src="/taplo-logo-full-color.png" alt="Taplo" className="mb-4 h-auto w-28" />
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--primary)]">Upcoming interview</p>
            <h1 className="mt-2 text-2xl font-bold">{meeting.candidateName}</h1>
            <p className="text-sm text-[var(--muted-foreground)]">{meeting.roleTitle}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{new Date(meeting.scheduledAt).toLocaleString()}</p>
          </div>
          <button
            onClick={() => void run("Dismissing", () => store.dismissMeetingPanel(meeting.id))}
            className="rounded-full border border-[var(--border)] bg-[var(--card)] p-2 text-[var(--muted-foreground)] shadow-[var(--shadow-soft)] hover:text-[var(--foreground)]"
            aria-label="Dismiss panel"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <PanelCard title="Join meeting">
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            {meeting.joinUrl
              ? "Open the interview in the meeting app, confirm consent, then start recording when everyone is ready."
              : "No join link on this calendar event. Join from your calendar or meeting app, then confirm consent and start recording here."}
          </p>
          <button
            disabled={!meeting.joinUrl}
            onClick={() => void run("Opening meeting", () => store.openMeetingJoinUrl(meeting.id))}
            className="mt-4 w-full rounded-full bg-[var(--primary)] px-4 py-3 font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-soft)] disabled:opacity-40"
          >
            <ExternalLink className="mr-2 inline h-4 w-4" />
            Join in meeting app
          </button>
        </PanelCard>

        <JobDescriptionPanelCard
          meetingId={meeting.id}
          jobDescription={meeting.jobDescription}
          onSave={async (jobDescription) => {
            const nextWorkspace = await store.updateMeeting({ meetingId: meeting.id, patch: { jobDescription } });
            setWorkspace(nextWorkspace);
          }}
        />

        <PanelCard title="Consent">
          {consentConfirmed ? (
            <div className="rounded-2xl bg-emerald-100 p-3 text-sm font-semibold text-emerald-900">
              <ShieldCheck className="mr-2 inline h-4 w-4" />
              Consent confirmed by {meeting.consentConfirmedBy ?? "Recruiter"}
            </div>
          ) : (
            <>
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                Confirm that the candidate has agreed to recording before starting capture.
              </p>
              <button
                onClick={() => void run("Confirming consent", () => store.confirmConsent(meeting.id))}
                className="mt-4 w-full rounded-full bg-emerald-600 px-4 py-3 font-bold text-white shadow-[var(--shadow-soft)]"
              >
                <ShieldCheck className="mr-2 inline h-4 w-4" />
                I have candidate consent
              </button>
            </>
          )}
        </PanelCard>

        <PanelCard title="Recording">
          <div className="mb-3 rounded-2xl bg-[var(--muted)]/50 p-3 text-sm">
            <span className="font-bold">Status:</span> <span className="capitalize">{session?.status ?? "not started"}</span>
            {session?.recordingMode && (
              <span className="ml-2 rounded-full bg-[var(--card)] px-2 py-1 text-[10px] font-bold uppercase text-[var(--muted-foreground)]">
                {session.recordingMode === "recall" ? "Recall recording" : "Mock recording"}
              </span>
            )}
          </div>
          {session?.recallUploadId && (
            <div className="mb-3 rounded-2xl bg-sky-100 p-3 text-xs font-semibold text-sky-900">
              Recall upload {shortenId(session.recallUploadId)} is attached to this session.
            </div>
          )}
          {session?.recordingError && (
            <div className="mb-3 rounded-2xl bg-amber-100 p-3 text-xs font-semibold text-amber-950">
              {session.recordingError}
            </div>
          )}
          {!hasJobDescription && (
            <div className="mb-3 rounded-2xl bg-amber-50 p-3 text-xs leading-5 text-amber-950">
              Add a job description above for better live insights and final analysis. You can still record without one.
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <PanelButton
              disabled={!consentConfirmed || Boolean(session && session.status !== "stopped")}
              onClick={() => void run("Starting recording", () => store.startRecording({ meetingId: meeting.id }))}
              icon={Mic}
              label="Start"
            />
            <PanelButton
              disabled={!session || session.status !== "recording"}
              onClick={() => {
                if (session) {
                  void run("Pausing", () => store.pauseRecording({ sessionId: session.id }));
                }
              }}
              icon={Pause}
              label="Pause"
            />
            <PanelButton
              disabled={!session || session.status !== "paused"}
              onClick={() => {
                if (session) {
                  void run("Resuming", () => store.resumeRecording({ sessionId: session.id }));
                }
              }}
              icon={Play}
              label="Resume"
            />
            <PanelButton
              disabled={!session || (session.status !== "recording" && session.status !== "paused")}
              onClick={() => void stopAndAnalyze()}
              icon={Square}
              label="Stop"
            />
          </div>
          <p className="mt-3 text-center text-xs text-[var(--muted-foreground)]">{busy ?? "Ready"}</p>
        </PanelCard>

        <PanelCard title="Live insights">
          {latestGuidance ? (
            <div className="space-y-3 text-sm">
              <InsightList title="Covered" items={latestGuidance.coveredTopics} />
              <InsightList title="Gaps" items={latestGuidance.gaps} />
              <InsightList title="Follow-ups" items={latestGuidance.suggestedFollowUps} />
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">Insights will appear during recording every 25 seconds.</p>
          )}
        </PanelCard>

        <PanelCard title="Transcript snippets">
          <div className="space-y-2">
            {transcriptSegments.length ? (
              transcriptSegments.map((segment) => <TranscriptSnippet key={segment.id} segment={segment} />)
            ) : session?.recordingMode === "recall" && session.transcriptFetchStatus === "fetching" ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                Recording stopped. Waiting for Recall upload and transcript (this can take a few minutes).
              </p>
            ) : session?.recordingMode === "recall" && session.transcriptFetchStatus === "failed" ? (
              <p className="text-sm font-semibold text-amber-800">{session.transcriptFetchError ?? "Recall transcript fetch failed."}</p>
            ) : session?.recordingMode === "recall" && session.status === "stopped" ? (
              <p className="text-sm text-[var(--muted-foreground)]">Recording stopped. Transcript will appear here once Recall processing completes.</p>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">Transcript snippets will appear after captured speech is available.</p>
            )}
          </div>
        </PanelCard>

        <PanelCard title="Analysis">
          <AnalysisStatus
            status={latestAnalysis ? "ready" : analysisStatus}
            analysis={latestAnalysis}
            error={analysisError || session?.analysisError || ""}
          />
          {session && transcriptSegments.length > 0 && !latestAnalysis && session.status === "stopped" && (
            <button
              onClick={() => void analyzeStoppedSession(session.id, workspace)}
              className="mt-4 w-full rounded-full bg-[var(--primary)] px-4 py-3 text-sm font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-soft)]"
            >
              Run analysis
            </button>
          )}
        </PanelCard>
      </div>
    </main>
  );
}

function AnalysisStatus({
  status,
  analysis,
  error,
}: {
  status: "idle" | "analyzing" | "ready" | "pending-transcript" | "error";
  analysis?: AnalysisOutput;
  error: string;
}) {
  if (analysis || status === "ready") {
    return (
      <div className="space-y-2 text-sm">
        <div className="rounded-2xl bg-emerald-100 p-3 font-semibold text-emerald-900">Analysis ready.</div>
        {analysis?.candidateSummary && <p className="leading-6 text-[var(--muted-foreground)]">{analysis.candidateSummary}</p>}
        {error && <p className="text-xs font-semibold text-amber-800">{error}</p>}
      </div>
    );
  }

  if (status === "analyzing") {
    return <p className="text-sm text-[var(--muted-foreground)]">Analyzing transcript with Claude...</p>;
  }

  if (status === "pending-transcript") {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">
        Recording stopped. Taplo is fetching the Recall transcript and will run Claude analysis automatically when it is ready.
      </p>
    );
  }

  if (status === "error") {
    return <p className="text-sm font-semibold text-amber-800">{error || "Analysis failed."}</p>;
  }

  return <p className="text-sm text-[var(--muted-foreground)]">Analysis will run automatically after recording stops if transcript is available.</p>;
}

function JobDescriptionPanelCard({
  meetingId,
  jobDescription,
  onSave,
}: {
  meetingId: string;
  jobDescription: string;
  onSave: (jobDescription: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(!jobDescription.trim());
  const [draft, setDraft] = useState(jobDescription);
  const [saving, setSaving] = useState(false);
  const hasSaved = Boolean(jobDescription.trim());

  useEffect(() => {
    setDraft(jobDescription);
    setEditing(!jobDescription.trim());
  }, [meetingId, jobDescription]);

  const preview = jobDescription.trim().split("\n").slice(0, 2).join("\n");

  return (
    <PanelCard title="Job description">
      {hasSaved && !editing ? (
        <div className="space-y-3">
          <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--muted-foreground)]">{preview}</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-full bg-[var(--muted)] px-4 py-2 text-xs font-bold text-[var(--muted-foreground)] hover:bg-[var(--border)]"
          >
            Edit job description
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Paste the job description for this role. Taplo uses it with the interview transcript for analysis.
          </p>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={6}
            className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
            placeholder="Paste job description..."
          />
          <button
            type="button"
            disabled={saving || !draft.trim()}
            onClick={() => {
              setSaving(true);
              void onSave(draft.trim())
                .then(() => setEditing(false))
                .finally(() => setSaving(false));
            }}
            className="w-full rounded-full bg-[var(--primary)] px-4 py-3 font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-soft)] disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save job description"}
          </button>
        </div>
      )}
    </PanelCard>
  );
}

function PanelCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)]/92 p-4 shadow-[var(--shadow-soft)] backdrop-blur">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">{title}</h2>
      {children}
    </section>
  );
}

function PanelButton({
  disabled,
  onClick,
  icon: Icon,
  label,
}: {
  disabled: boolean;
  onClick: () => void;
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="rounded-2xl bg-[var(--foreground)] px-3 py-3 text-sm font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-soft)] disabled:cursor-not-allowed disabled:opacity-35"
    >
      <Icon className="mr-2 inline h-4 w-4" />
      {label}
    </button>
  );
}

function InsightList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-bold text-[var(--primary)]">{title}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-[var(--muted-foreground)]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function TranscriptSnippet({ segment }: { segment: TranscriptSegment }) {
  return (
    <div className="rounded-2xl bg-[var(--muted)]/50 p-3 text-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{segment.speaker}</p>
      <p className="mt-1 leading-6 text-[var(--foreground)]">{segment.text}</p>
    </div>
  );
}

function shortenId(value: string) {
  return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}
