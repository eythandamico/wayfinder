"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import {
  History,
  Pause,
  Play,
  RotateCw,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, Job, Session } from "../_types";
import type { Path } from "@/lib/paths";
import {
  MODELS,
  MODEL_PROVIDER,
  PATHS,
  SAMPLE_JOBS,
  SAMPLE_MESSAGES,
  SAMPLE_SESSIONS,
} from "../_data/mocks";
import { useVoiceInput } from "../_hooks/useVoiceInput";
import { ThinkingGlow } from "./ThinkingGlow";
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  ImageIcon,
  InfinityIcon,
  LockIcon,
  MicIcon,
  MicRecordingIcon,
  MoreIcon,
  PlusIcon,
} from "./icons";

export function ChatPanel() {
  const [input, setInput] = useState("");
  const [activeSession, setActiveSession] = useState(SAMPLE_SESSIONS[0]);
  const [thinking, setThinking] = useState(false);
  const [jobs, setJobs] = useState<Job[]>(SAMPLE_JOBS);
  const [paths, setPaths] = useState<Path[]>(() => PATHS.slice(0, 10));
  const [tab, setTab] = useState<"agent" | "paths" | "jobs">("agent");
  const thinkingTimer = useRef<number | null>(null);

  const startThinking = () => {
    setThinking(true);
    if (thinkingTimer.current) window.clearTimeout(thinkingTimer.current);
    thinkingTimer.current = window.setTimeout(() => setThinking(false), 3500);
  };

  useEffect(() => {
    return () => {
      if (thinkingTimer.current) window.clearTimeout(thinkingTimer.current);
    };
  }, []);

  const jumpToJob = (j: Job) => {
    const target = SAMPLE_SESSIONS.find((s) => s.id === j.sessionId);
    if (target) setActiveSession(target);
    setTab("agent");
  };

  const toggleJob = (id: string) =>
    setJobs((js) =>
      js.map((j) =>
        j.id === id
          ? {
              ...j,
              status:
                j.status === "paused" || j.status === "error"
                  ? "active"
                  : "paused",
            }
          : j,
      ),
    );

  const deleteJob = (id: string) =>
    setJobs((js) => js.filter((j) => j.id !== id));

  const uninstallPath = (id: string) =>
    setPaths((ps) => ps.filter((p) => p.id !== id));

  const [showUpgrade, setShowUpgrade] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      window.localStorage.getItem("wayfinder:pro-banner-dismissed") !== "1"
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowUpgrade(true);
    }
  }, []);
  const dismissUpgrade = () => {
    try {
      window.localStorage.setItem("wayfinder:pro-banner-dismissed", "1");
    } catch {
      // storage unavailable; dismissal stays session-scoped
    }
    setShowUpgrade(false);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg bg-muted">
      <div className="flex items-stretch border-b border-white/5">
        <div
          role="tablist"
          aria-label="Agent, paths, and jobs"
          className="flex px-2"
        >
          <TabButton
            active={tab === "agent"}
            onClick={() => setTab("agent")}
            label="Agent"
            count={SAMPLE_SESSIONS.length}
            controls="shells-panel-agent"
          />
          <TabButton
            active={tab === "paths"}
            onClick={() => setTab("paths")}
            label="Paths"
            count={paths.length}
            controls="shells-panel-paths"
          />
          <TabButton
            active={tab === "jobs"}
            onClick={() => setTab("jobs")}
            label="Jobs"
            count={jobs.length}
            controls="shells-panel-jobs"
          />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-0.5 px-2">
          <HistoryDropdown
            active={activeSession}
            onSelect={setActiveSession}
          />
          <IconButton aria-label="New chat">
            <PlusIcon />
          </IconButton>
        </div>
      </div>

      {tab === "agent" && (
        <div
          id="shells-panel-agent"
          role="tabpanel"
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="px-3 pt-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="truncate px-2 py-1 text-body font-semibold text-foreground">
                {activeSession.name}
              </span>
              <div className="flex shrink-0 items-center gap-0.5">
                <IconButton aria-label="More options">
                  <MoreIcon />
                </IconButton>
              </div>
            </div>
          </div>
          <div className="scroll-thin min-h-0 flex-1 space-y-4 overflow-y-auto px-3">
            {SAMPLE_MESSAGES.map((m, i) => (
              <Message key={i} message={m} />
            ))}
            {thinking && <ThinkingIndicator />}
          </div>
          <div className="px-3 pb-3">
            {showUpgrade && <UpgradeBanner onDismiss={dismissUpgrade} />}
            <ChatComposer
              value={input}
              onChange={setInput}
              thinking={thinking}
              onSubmit={startThinking}
            />
          </div>
        </div>
      )}

      {tab === "paths" && (
        <div
          id="shells-panel-paths"
          role="tabpanel"
          className="flex min-h-0 flex-1 flex-col"
        >
          <PathsPanel paths={paths} onUninstall={uninstallPath} />
        </div>
      )}

      {tab === "jobs" && (
        <div
          id="shells-panel-jobs"
          role="tabpanel"
          className="flex min-h-0 flex-1 flex-col"
        >
          <JobsPanel
            jobs={jobs}
            onSelect={jumpToJob}
            onToggle={toggleJob}
            onDelete={deleteJob}
          />
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
  controls,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  controls: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={cn(
        "relative px-4 py-3 text-body font-medium transition-[color,scale] duration-150 ease-out active:scale-[0.96]",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <span className="ml-1.5 tabular-nums text-muted-foreground">{count}</span>
      {active && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-2 bottom-0 h-px bg-foreground"
        />
      )}
    </button>
  );
}

function HistoryDropdown({
  active,
  onSelect,
}: {
  active: Session;
  onSelect: (s: Session) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", key);
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", key);
      cancelAnimationFrame(raf);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SAMPLE_SESSIONS;
    return SAMPLE_SESSIONS.filter((s) => s.name.toLowerCase().includes(q));
  }, [query]);

  return (
    <div ref={ref} className="relative">
      <IconButton
        aria-label="Chat history"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <HistoryIcon />
      </IconButton>
      <div
        role="dialog"
        aria-label="Chat history"
        aria-hidden={!open}
        className={cn(
          "absolute right-0 top-full z-20 mt-1 w-72 origin-top-right overflow-hidden rounded-lg bg-background shadow-xl ring-1 ring-white/5 transition-[opacity,transform] duration-150 ease-out",
          open
            ? "opacity-100 translate-y-0 scale-100"
            : "pointer-events-none opacity-0 -translate-y-1 scale-[0.98]",
        )}
      >
        <div className="border-b border-white/5 p-1.5">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sessions..."
              className="w-full rounded-md bg-white/[0.04] py-1.5 pl-8 pr-2.5 text-body text-foreground outline-none placeholder:text-muted-foreground focus-visible:bg-white/[0.08] focus-visible:ring-1 focus-visible:ring-white/10"
            />
          </div>
        </div>
        <div className="scroll-thin max-h-72 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-body text-muted-foreground">
              No sessions match &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                role="menuitemradio"
                aria-checked={s.id === active.id}
                onClick={() => {
                  onSelect(s);
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-body transition-colors hover:bg-white/[0.05]",
                  s.id === active.id && "bg-white/[0.04]",
                )}
              >
                <span className="truncate">{s.name}</span>
                <span className="text-body text-muted-foreground tabular-nums">
                  {s.age}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PathsPanel({
  paths,
  onUninstall,
}: {
  paths: Path[];
  onUninstall: (id: string) => void;
}) {
  if (paths.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 px-6 py-12 text-center">
        <p className="text-body text-foreground">No paths installed.</p>
        <p className="max-w-[260px] text-body text-muted-foreground">
          Browse the catalog and install one to run here.
        </p>
        <Link
          href="/paths"
          className="mt-3 rounded-md bg-primary/15 px-3 py-1.5 text-body font-semibold text-primary ring-1 ring-inset ring-primary/20 transition-colors hover:bg-primary/20"
        >
          Browse paths →
        </Link>
      </div>
    );
  }
  return (
    <div className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
      {paths.map((p) => (
        <PathRow
          key={p.id}
          path={p}
          onUninstall={() => onUninstall(p.id)}
        />
      ))}
      <Link
        href="/paths"
        className="mt-2 flex items-center justify-center gap-1 rounded-md px-3 py-2 text-body text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
      >
        Browse more paths →
      </Link>
    </div>
  );
}

function PathRow({
  path,
  onUninstall,
}: {
  path: Path;
  onUninstall: () => void;
}) {
  return (
    <div className="group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-white/[0.04]">
      <Link
        href="/paths"
        className="flex min-w-0 flex-1 items-center gap-2.5"
      >
        <span
          aria-hidden
          className="size-7 shrink-0 rounded-md"
          style={{
            background: `linear-gradient(135deg, color-mix(in oklch, var(--primary) 40%, transparent), color-mix(in oklch, var(--primary) 8%, transparent))`,
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body text-foreground">
            {path.name}
          </span>
          <span className="truncate text-body text-muted-foreground">
            {path.author}
            {path.version ? ` · v${path.version}` : ""}
          </span>
        </div>
      </Link>
      <RowAction
        aria-label={`Uninstall ${path.name}`}
        onClick={onUninstall}
        tone="danger"
      >
        <CloseIcon />
      </RowAction>
    </div>
  );
}

function JobsPanel({
  jobs,
  onSelect,
  onToggle,
  onDelete,
}: {
  jobs: Job[];
  onSelect: (j: Job) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 px-6 py-12 text-center">
        <p className="text-body text-foreground">No jobs yet.</p>
        <p className="max-w-[260px] text-body text-muted-foreground">
          Ask your agent to set one up — e.g. &ldquo;every 15m monitor my BTC
          funding&rdquo;.
        </p>
      </div>
    );
  }
  return (
    <div className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
      {jobs.map((j) => (
        <JobRow
          key={j.id}
          job={j}
          onSelect={() => onSelect(j)}
          onToggle={() => onToggle(j.id)}
          onDelete={() => onDelete(j.id)}
        />
      ))}
    </div>
  );
}

function JobRow({
  job,
  onSelect,
  onToggle,
  onDelete,
}: {
  job: Job;
  onSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const dot =
    job.status === "active"
      ? "bg-primary shadow-[0_0_6px_var(--primary)]"
      : job.status === "paused"
        ? "bg-white/20"
        : "bg-tone-down shadow-[0_0_6px_var(--tone-down)]";
  const toggleIcon =
    job.status === "active" ? (
      <PauseIcon />
    ) : job.status === "error" ? (
      <RetryIcon />
    ) : (
      <PlayIcon />
    );
  const toggleLabel =
    job.status === "active"
      ? `Pause ${job.name}`
      : job.status === "error"
        ? `Retry ${job.name}`
        : `Resume ${job.name}`;
  return (
    <div className="group flex items-start gap-2 rounded-md px-2 py-2 transition-colors hover:bg-white/[0.04]">
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
      >
        <span
          aria-hidden
          className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", dot)}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-body">{job.name}</span>
          <span className="truncate text-body text-muted-foreground">
            {job.cadence}
            {job.lastRunAt ? ` · ran ${job.lastRunAt}` : ""}
            {job.status === "paused" ? " · paused" : ""}
            {job.status === "error" ? " · failed" : ""}
          </span>
        </div>
      </button>
      <div className="flex shrink-0 items-center gap-0.5">
        <RowAction aria-label={toggleLabel} onClick={onToggle}>
          {toggleIcon}
        </RowAction>
        <RowAction
          aria-label={`Delete ${job.name}`}
          onClick={onDelete}
          tone="danger"
        >
          <CloseIcon />
        </RowAction>
      </div>
    </div>
  );
}

function RowAction({
  children,
  onClick,
  tone,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "danger";
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
        tone === "danger"
          ? "hover:bg-tone-down/15 hover:text-tone-down"
          : "hover:bg-white/[0.08] hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------- */
/*  Upgrade banner                                             */
/* ---------------------------------------------------------- */

function UpgradeBanner({ onDismiss }: { onDismiss: () => void }) {
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleDismiss = () => {
    setLeaving(true);
    window.setTimeout(onDismiss, 200);
  };

  return (
    <div
      className={cn(
        "relative mb-2 flex items-center gap-2 overflow-hidden rounded-lg px-3 py-2 text-body transition-[opacity,transform] duration-300 ease-[var(--ease-strong)] motion-reduce:transition-none",
        !entered || leaving
          ? "opacity-0 -translate-y-1"
          : "opacity-100 translate-y-0",
      )}
      style={{
        background:
          "color-mix(in oklch, var(--wf-pro-gold) 15%, transparent)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/5 motion-safe:animate-[shimmer_4.5s_ease-in-out_infinite]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, color-mix(in oklch, var(--wf-pro-gold) 10%, transparent) 50%, transparent 100%)",
        }}
      />
      <span
        className="relative min-w-0 flex-1 truncate"
        style={{ color: "var(--wf-pro-gold)" }}
      >
        <span className="font-semibold">Agent always on</span>
        <span className="opacity-60"> - </span>
        Run jobs and paths 24/7 with Pro.
      </span>
      <a
        href="https://checkout.stripe.com/c/pay/cs_test_b16tiEiHftbAenCNDBPf1SS17U4Tz1KChWZmRxeTci0hgZOWUzkUISdOoS#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSd2cGd2ZndsdXFsamtQa2x0cGBrYHZ2QGtkZ2lgYSc%2FY2RpdmApJ2JwZGZkaGppYFNkd2xka3EnPydmamtxd2ppJyknZHVsTmB8Jz8ndW5acWB2cVowNFZ%2FS11PNkZoQVVTS2lyc2xTRFxiQFBRZDJcTUowb319QmJwSEBENld8bUpuQDVBQHZpV1wwNzVVbjFdbTRgT3xiS0RJaHUycGtdTzRKYmQ0cDN9NVB9PTU1aWlXNF1mYW0nKSdjd2poVmB3c2B3Jz9xd3BgKSdnZGZuYndqcGthRmppancnPycmNWQ1YzVkJyknaWR8anBxUXx1YCc%2FJ2hwaXFsWmxxYGgnKSdga2RnaWBVaWRmYG1qaWFgd3YnP3F3cGB4JSUl"
        target="_blank"
        rel="noopener noreferrer"
        className="relative shrink-0 text-body font-semibold transition-[opacity,scale] duration-150 ease-out hover:opacity-80 active:scale-[0.96]"
        style={{ color: "var(--wf-pro-gold)" }}
      >
        Upgrade
      </a>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss upgrade prompt"
        className="relative flex size-5 shrink-0 items-center justify-center rounded transition-colors hover:bg-white/[0.06]"
        style={{ color: "var(--wf-pro-gold)" }}
      >
        <CloseIcon />
      </button>
    </div>
  );
}

/* ---------------------------------------------------------- */
/*  Icons local to this panel — wrappers around lucide for     */
/*  consistent stroke + sizing in this component's context.    */
/* ---------------------------------------------------------- */

function HistoryIcon() {
  return <History strokeWidth={1.5} className="size-[15px]" aria-hidden />;
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <Search
      strokeWidth={1.5}
      className={className ?? "size-3.5"}
      aria-hidden
    />
  );
}

function PauseIcon() {
  return <Pause strokeWidth={0} fill="currentColor" className="size-3" aria-hidden />;
}

function PlayIcon() {
  return <Play strokeWidth={0} fill="currentColor" className="size-3" aria-hidden />;
}

function RetryIcon() {
  return <RotateCw strokeWidth={1.5} className="size-3" aria-hidden />;
}

function CloseIcon() {
  return <X strokeWidth={1.75} className="size-3" aria-hidden />;
}

/* ---------------------------------------------------------- */
/*  Composer                                                   */
/* ---------------------------------------------------------- */

function ChatComposer({
  value,
  onChange,
  thinking,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  thinking: boolean;
  onSubmit: () => void;
}) {
  const { recording, toggle, supported } = useVoiceInput((text) => {
    onChange(value ? `${value} ${text}` : text);
  });

  const hasContent = value.trim().length > 0;

  const handleSend = () => {
    if (!hasContent) return;
    onSubmit();
    onChange("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative mt-4">
      <ThinkingGlow active={thinking} />
      <div className="relative flex flex-col rounded-2xl bg-background/40 ring-1 ring-inset ring-white/5 transition-[box-shadow] duration-200 ease-out focus-within:ring-white/15">
        <label htmlFor="chat-composer" className="sr-only">
          Chat message
        </label>
        <textarea
          id="chat-composer"
          aria-label="Chat message"
          placeholder="Plan, Build, / for commands, @ for context"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
          className="resize-none bg-transparent px-4 pt-3.5 pb-2 text-body leading-[1.55] text-foreground outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-1">
            <AgentPill />
            <ModePill label="Auto" />
          </div>
          <div className="flex items-center gap-1">
            <IconButton aria-label="Attach image">
              <ImageIcon />
            </IconButton>
            <SendOrMicButton
              hasContent={hasContent}
              recording={recording}
              micSupported={supported}
              onMicToggle={toggle}
              onSend={handleSend}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SendOrMicButton({
  hasContent,
  recording,
  micSupported,
  onMicToggle,
  onSend,
}: {
  hasContent: boolean;
  recording: boolean;
  micSupported: boolean;
  onMicToggle: () => void;
  onSend: () => void;
}) {
  const disabled = !hasContent && !micSupported;
  return (
    <button
      type="button"
      onClick={hasContent ? onSend : onMicToggle}
      disabled={disabled}
      aria-label={
        hasContent
          ? "Send message"
          : recording
            ? "Stop voice input"
            : "Voice input"
      }
      className={cn(
        "relative flex size-9 items-center justify-center overflow-hidden rounded-full transition-[background-color,color,scale] duration-200 ease-out active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50",
        hasContent
          ? "bg-primary text-primary-foreground hover:brightness-110"
          : recording
            ? "bg-primary/80 text-primary-foreground"
            : "bg-white/10 text-muted-foreground hover:bg-white/15 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
          hasContent
            ? "scale-[0.25] opacity-0 blur-[4px]"
            : "scale-100 opacity-100 blur-0",
        )}
      >
        {recording ? <MicRecordingIcon /> : <MicIcon />}
      </span>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
          hasContent
            ? "scale-100 opacity-100 blur-0"
            : "scale-[0.25] opacity-0 blur-[4px]",
        )}
      >
        <ArrowUpIcon />
      </span>
    </button>
  );
}

function AgentPill() {
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState(MODELS[0]);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="agent-menu"
        aria-label={`Model: ${model.label}. Choose model`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-[var(--ui-h-pill)] items-center gap-1.5 rounded-full bg-white/5 px-3 text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-white/10 hover:text-foreground active:scale-[0.96]"
      >
        <InfinityIcon />
        <span className="text-body font-medium text-foreground">{model.label}</span>
        <ChevronDownIcon
          aria-hidden
          className={cn(
            "size-3 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        id="agent-menu"
        role="menu"
        aria-hidden={!open}
        className={cn(
          "absolute bottom-full left-0 z-20 mb-2 w-64 origin-bottom-left rounded-lg bg-background p-1 shadow-xl ring-1 ring-white/5 transition-[opacity,transform] duration-150 ease-[var(--ease-strong)]",
          open
            ? "opacity-100 translate-y-0 scale-100"
            : "pointer-events-none opacity-0 translate-y-1 scale-[0.98]",
        )}
      >
        <div className="px-3 pb-1.5 pt-2 text-body text-muted-foreground">
          {MODEL_PROVIDER}
        </div>
        {MODELS.map((m) => {
          const active = m.id === model.id;
          return (
            <button
              key={m.id}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              onClick={() => {
                setModel(m);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors",
                active ? "bg-primary/10" : "hover:bg-white/[0.04]",
              )}
            >
              <span
                className={cn(
                  "text-body",
                  active ? "text-primary" : "text-foreground",
                )}
              >
                {m.label}
              </span>
              {active && <CheckIcon />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ModePill({ label }: { label: string }) {
  return (
    <button
      type="button"
      aria-label={`Chat mode: ${label} (locked)`}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-body text-muted-foreground transition-[color,scale] duration-150 ease-out hover:text-foreground active:scale-[0.96]"
    >
      {label}
      <LockIcon />
    </button>
  );
}

function IconButton({
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "relative flex items-center justify-center rounded-md p-[var(--ui-y)] text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-white/[0.05] hover:text-foreground active:scale-[0.96]",
        "before:absolute before:-inset-1 before:content-['']",
        className,
      )}
    >
      {children}
    </button>
  );
}

function ThinkingIndicator() {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => {
      setElapsedMs(performance.now() - start);
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  const secs = Math.floor(elapsedMs / 1000);
  const mins = Math.floor(secs / 60);
  const timeStr = mins > 0 ? `${mins}m ${secs % 60}s` : `${secs}s`;
  const tokens = Math.floor((elapsedMs / 1000) * 32);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="flex items-center gap-2 text-body text-muted-foreground"
    >
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="size-3.5 animate-spin text-primary"
        style={{ animationDuration: "900ms" }}
        fill="none"
      >
        <circle
          cx="8"
          cy="8"
          r="6"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.18"
        />
        <path
          d="M14 8a6 6 0 0 0-6-6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span>thinking…</span>
      <span className="tabular-nums text-muted-foreground">
        {timeStr} · {tokens} tokens
      </span>
    </div>
  );
}

function Message({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] rounded-2xl bg-white/[0.06] px-4 py-2 text-body text-foreground">
          {message.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="whitespace-pre-wrap text-body text-foreground">
        {message.text}
      </div>
      <span className="text-body text-muted-foreground">
        {message.meta}
      </span>
    </div>
  );
}
