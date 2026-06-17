"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ListChecks, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Todo panel — local-first task list that persists in localStorage.
 *
 * Each item has a stable id, text, completed flag, priority (1=low,
 * 2=med, 3=high), and optional due timestamp. Priority is reflected
 * by a colored dot; due date renders inline next to the text.
 */

type Todo = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  priority: 1 | 2 | 3;
};

const STORAGE_KEY = "wf-todos-v1";

export function TodoPanel() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [draft, setDraft] = useState("");
  const [priority, setPriority] = useState<Todo["priority"]>(2);
  const [showCompleted, setShowCompleted] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Todo[];
      if (Array.isArray(parsed)) {
        setTodos(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch {
      /* quota / private window */
    }
  }, [todos]);

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setTodos((cur) => [
      {
        id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text,
        completed: false,
        createdAt: Date.now(),
        priority,
      },
      ...cur,
    ]);
    setDraft("");
    setPriority(2);
  };

  const toggle = (id: string) =>
    setTodos((cur) =>
      cur.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  const remove = (id: string) =>
    setTodos((cur) => cur.filter((t) => t.id !== id));
  const clearCompleted = () =>
    setTodos((cur) => cur.filter((t) => !t.completed));

  const { pending, completed } = useMemo(() => {
    const p: Todo[] = [];
    const c: Todo[] = [];
    for (const t of todos) (t.completed ? c : p).push(t);
    // Pending sorted by priority desc, then createdAt desc.
    p.sort((a, b) => b.priority - a.priority || b.createdAt - a.createdAt);
    return { pending: p, completed: c };
  }, [todos]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Quick-add row */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-white/[0.05] px-3 py-2">
        <PriorityDot
          priority={priority}
          onCycle={() =>
            setPriority((p) => (((p % 3) + 1) as Todo["priority"]))
          }
        />
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="Add a task…"
          className="flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={add}
          aria-label="Add task"
          className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground"
        >
          <Plus strokeWidth={2} className="size-3.5" />
        </button>
      </div>

      {/* List */}
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto py-1">
        {pending.length === 0 && completed.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {pending.map((t) => (
              <TodoRow
                key={t.id}
                todo={t}
                onToggle={() => toggle(t.id)}
                onRemove={() => remove(t.id)}
              />
            ))}

            {completed.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setShowCompleted((v) => !v)}
                  className="mt-2 flex w-full items-center gap-1.5 px-3 py-1 text-micro uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span>
                    {showCompleted ? "▾" : "▸"} Completed · {completed.length}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 normal-case tracking-normal text-caption text-muted-foreground/70 hover:text-foreground">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        clearCompleted();
                      }}
                    >
                      clear all
                    </span>
                  </span>
                </button>
                {showCompleted &&
                  completed.map((t) => (
                    <TodoRow
                      key={t.id}
                      todo={t}
                      onToggle={() => toggle(t.id)}
                      onRemove={() => remove(t.id)}
                    />
                  ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer count */}
      <div className="shrink-0 border-t border-white/[0.05] px-3 py-1.5 text-caption text-muted-foreground">
        {pending.length} remaining
        {completed.length > 0 && (
          <span className="text-muted-foreground/70">
            {" · "}
            {completed.length} done
          </span>
        )}
      </div>
    </div>
  );
}

function TodoRow({
  todo,
  onToggle,
  onRemove,
}: {
  todo: Todo;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="group/todo flex items-center gap-2 px-3 py-1.5 transition-colors hover:bg-white/[0.02]">
      <button
        type="button"
        onClick={onToggle}
        aria-label={todo.completed ? "Mark as not done" : "Mark as done"}
        className={cn(
          "inline-flex size-4 shrink-0 items-center justify-center rounded-sm ring-1 ring-inset transition-colors",
          todo.completed
            ? "bg-primary ring-primary text-primary-foreground"
            : "ring-white/[0.10] hover:ring-white/30",
        )}
      >
        {todo.completed && <Check strokeWidth={3} className="size-2.5" />}
      </button>
      <PriorityDot priority={todo.priority} subtle />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-body",
          todo.completed
            ? "text-muted-foreground line-through"
            : "text-foreground",
        )}
      >
        {todo.text}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Delete task"
        className="inline-flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-[opacity,background-color,color] group-hover/todo:opacity-100 hover:bg-surface-1 hover:text-tone-down"
      >
        <Trash2 strokeWidth={1.75} className="size-3" />
      </button>
    </div>
  );
}

function PriorityDot({
  priority,
  subtle,
  onCycle,
}: {
  priority: Todo["priority"];
  subtle?: boolean;
  onCycle?: () => void;
}) {
  const color =
    priority === 3 ? "bg-tone-down" : priority === 2 ? "bg-primary" : "bg-white/30";
  const label = priority === 3 ? "High" : priority === 2 ? "Medium" : "Low";
  const Wrapper = onCycle ? "button" : "span";
  return (
    <Wrapper
      type={onCycle ? "button" : undefined}
      onClick={onCycle}
      aria-label={onCycle ? `Priority ${label} — click to cycle` : `Priority ${label}`}
      className={cn(
        "inline-flex size-3 shrink-0 items-center justify-center rounded-full",
        onCycle && "transition-transform hover:scale-110",
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", color, subtle && "opacity-60")}
      />
    </Wrapper>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <span className="grid size-10 place-items-center rounded-xl bg-surface-1 text-muted-foreground">
        <ListChecks strokeWidth={1.5} className="size-5" />
      </span>
      <span className="text-body font-semibold text-foreground">All clear</span>
      <span className="text-caption text-muted-foreground">
        Add a task to get started.
      </span>
    </div>
  );
}

