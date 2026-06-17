/**
 * Demo runner — drives the UI through a scripted timeline of cursor
 * moves, synthetic clicks, and dopamine pops. Pairs with
 * <DemoOverlay/> mounted in /shells/page.tsx.
 *
 * Targeting model: every step that needs to land on an element uses a
 * CSS selector (typically a `data-demo="..."` attribute) and the
 * runner queries the live element at execution time. Pixel coords are
 * supported as `{ x, y }` for situations where no element exists
 * (e.g., cursor enters from off-screen).
 *
 * Scheduling: one `setTimeout` per step, keyed off the step's `at`
 * offset from start. `stop()` clears them all and hides the cursor.
 */

import { triggerDopamine } from "./dopamine";
import type { DopamineId } from "./dopamine";

export type DemoTarget = string | { x: number; y: number };

export type DemoStep =
  | {
      at: number;
      kind: "cursor";
      target: DemoTarget;
      /** Override the default per-hop animation duration (ms). */
      durationMs?: number;
    }
  | {
      at: number;
      kind: "click";
      /** Optional — if string, the runner queries the selector and
       *  invokes `.click()` on it. If a point, the cursor snaps there
       *  and pulses but no DOM click fires. */
      target?: DemoTarget;
    }
  | { at: number; kind: "dopamine"; id: DopamineId | "random" }
  | { at: number; kind: "scroll"; selector: string; top: number }
  | {
      at: number;
      kind: "type";
      selector: string;
      text: string;
      /** Per-character delay in ms. Defaults to TYPE_CHAR_DELAY (55). */
      charDelayMs?: number;
    }
  /** Dispatch an arbitrary CustomEvent on window. Used by the script
   *  to drive components that listen for demo-specific events
   *  (agent replies, friend replies, plot chart, set market, etc.). */
  | { at: number; kind: "dispatch"; event: string; detail?: unknown }
  /** Sugar for dispatching an agent assistant reply. */
  | { at: number; kind: "agent-reply"; text: string; meta?: string }
  /** Sugar for dispatching a friend incoming message. */
  | {
      at: number;
      kind: "friend-reply";
      friendId: string;
      content: string;
      emoji?: boolean;
    }
  /** Sugar for drawing a support/analysis line on the main chart.
   *  ChartPanel renders the dashed line + label overlay; no new
   *  panel is added. yPct (0-100) sets the line's vertical position
   *  in the chart area since the TradingView iframe price→pixel
   *  mapping isn't accessible from the host page. */
  | {
      at: number;
      kind: "plot-chart";
      title: string;
      price?: string;
      yPct?: number;
    }
  /** Append a panel to the layout root (DemoLayoutBridge picks this
   *  up and dispatches the layout reducer action). Used to surface
   *  the Companion or Friends panel mid-sequence without leaving
   *  them in the default tree. */
  | {
      at: number;
      kind: "add-panel";
      panelType: string;
      panelId?: string;
    };

export type CursorState = {
  x: number;
  y: number;
  /** Duration of the CSS transform transition for the next render. */
  durationMs: number;
  visible: boolean;
  clicking: boolean;
};

export const INITIAL_CURSOR: CursorState = {
  x: -100,
  y: -100,
  durationMs: 0,
  visible: false,
  clicking: false,
};

/** Average pixels-per-millisecond for cursor moves. Tuned so a 600px
 *  hop takes ~700ms — natural-feeling, not so slow the demo drags. */
const CURSOR_PX_PER_MS = 0.85;
const CURSOR_MIN_DURATION = 350;
const CURSOR_MAX_DURATION = 1200;

/** Default per-character delay for the typewriter `type` step. */
const TYPE_CHAR_DELAY = 55;

/** Helper exported so callers (e.g. demo-scripts) can compute slack
 *  to leave between a `type` step and whatever fires after it. */
export function typeDurationMs(text: string, charDelayMs = TYPE_CHAR_DELAY) {
  return text.length * charDelayMs;
}

export class DemoRunner {
  private timers: number[] = [];
  private cursor: CursorState = INITIAL_CURSOR;
  private aborted = false;

  constructor(
    private script: DemoStep[],
    private push: (state: CursorState) => void,
    private onComplete: () => void,
  ) {}

  start() {
    if (typeof window === "undefined") return;
    this.aborted = false;
    this.cursor = { ...INITIAL_CURSOR, visible: true };
    this.push(this.cursor);

    this.script.forEach((step) => {
      const id = window.setTimeout(() => {
        if (this.aborted) return;
        this.execute(step);
      }, Math.max(0, step.at));
      this.timers.push(id);
    });

    const lastAt = this.script.reduce((m, s) => Math.max(m, s.at), 0);
    const completionId = window.setTimeout(() => {
      if (this.aborted) return;
      this.finish();
      this.onComplete();
    }, lastAt + 1800);
    this.timers.push(completionId);
  }

  stop() {
    this.aborted = true;
    this.finish();
  }

  private finish() {
    this.timers.forEach((id) => window.clearTimeout(id));
    this.timers = [];
    this.update({ visible: false, clicking: false });
  }

  private update(patch: Partial<CursorState>) {
    this.cursor = { ...this.cursor, ...patch };
    this.push(this.cursor);
  }

  private execute(step: DemoStep) {
    switch (step.kind) {
      case "cursor": {
        const point = this.resolve(step.target);
        if (!point) return;
        const distance = Math.hypot(
          point.x - this.cursor.x,
          point.y - this.cursor.y,
        );
        const duration =
          step.durationMs ??
          Math.min(
            CURSOR_MAX_DURATION,
            Math.max(CURSOR_MIN_DURATION, distance / CURSOR_PX_PER_MS),
          );
        this.update({
          x: point.x,
          y: point.y,
          durationMs: duration,
          visible: true,
          clicking: false,
        });
        break;
      }
      case "click": {
        const point = step.target ? this.resolve(step.target) : null;
        if (point) {
          // Snap to the target so the pulse aligns even if the prior
          // cursor move underestimated travel time.
          this.update({
            x: point.x,
            y: point.y,
            durationMs: 0,
            clicking: true,
          });
        } else {
          this.update({ clicking: true });
        }
        if (typeof step.target === "string") {
          const el = document.querySelector<HTMLElement>(step.target);
          // Click handlers on the element itself; React's synthetic
          // events run via this path identically to a real click.
          el?.click();
        }
        const id = window.setTimeout(() => {
          if (this.aborted) return;
          this.update({ clicking: false });
        }, 380);
        this.timers.push(id);
        break;
      }
      case "dopamine":
        triggerDopamine(step.id);
        break;
      case "scroll": {
        const el = document.querySelector<HTMLElement>(step.selector);
        el?.scrollTo({ top: step.top, behavior: "smooth" });
        break;
      }
      case "type": {
        const el = document.querySelector<
          HTMLInputElement | HTMLTextAreaElement
        >(step.selector);
        if (!el) return;
        el.focus();
        const proto =
          el instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
        if (!setter) return;
        const delay = step.charDelayMs ?? TYPE_CHAR_DELAY;
        // Clear first so we type fresh rather than appending.
        setter.call(el, "");
        el.dispatchEvent(new Event("input", { bubbles: true }));
        // Schedule one timer per character; runner.timers is the
        // shared cancel list so stop() kills any in-flight typing.
        for (let i = 0; i < step.text.length; i++) {
          const charIndex = i;
          const id = window.setTimeout(
            () => {
              if (this.aborted) return;
              const next = step.text.slice(0, charIndex + 1);
              setter.call(el, next);
              el.dispatchEvent(new Event("input", { bubbles: true }));
            },
            delay * (charIndex + 1),
          );
          this.timers.push(id);
        }
        break;
      }
      case "dispatch": {
        window.dispatchEvent(
          new CustomEvent(step.event, { detail: step.detail }),
        );
        break;
      }
      case "agent-reply": {
        window.dispatchEvent(
          new CustomEvent("wf:demo:agent-reply", {
            detail: { text: step.text, meta: step.meta ?? "now" },
          }),
        );
        break;
      }
      case "friend-reply": {
        window.dispatchEvent(
          new CustomEvent("wf:demo:friend-reply", {
            detail: {
              friendId: step.friendId,
              content: step.content,
              emoji: step.emoji,
            },
          }),
        );
        break;
      }
      case "plot-chart": {
        window.dispatchEvent(
          new CustomEvent("wf:demo:plot-chart", {
            detail: {
              title: step.title,
              price: step.price,
              yPct: step.yPct,
            },
          }),
        );
        break;
      }
      case "add-panel": {
        window.dispatchEvent(
          new CustomEvent("wf:demo:add-panel", {
            detail: {
              panelType: step.panelType,
              panelId:
                step.panelId ??
                `${step.panelType}-demo-${Date.now().toString(36)}`,
            },
          }),
        );
        break;
      }
    }
  }

  private resolve(target: DemoTarget): { x: number; y: number } | null {
    if (typeof target === "object") return target;
    const el = document.querySelector(target);
    if (!el) {
      console.warn(`[demo] target not found: ${target}`);
      return null;
    }
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
}

/* ------------------------------------------------------------------ */
/*  Recording                                                          */
/* ------------------------------------------------------------------ */

export type Recording = {
  stream: MediaStream;
  stop: () => Promise<Blob>;
};

/** Starts a `getDisplayMedia` capture of the current tab/screen and
 *  wraps it in a `MediaRecorder`. The native OS cursor is suppressed
 *  via `cursor: "never"` so only the fake demo cursor appears in the
 *  output. Returns `null` if permission is denied. */
export async function startRecording(): Promise<Recording | null> {
  if (typeof navigator === "undefined") return null;
  try {
    // The MediaTrackConstraints `cursor` field is in the Screen
    // Capture spec but not yet in standard lib.dom types — TS cast is
    // intentional and harmless on browsers that ignore the field.
    const stream = await navigator.mediaDevices.getDisplayMedia({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      video: { cursor: "never", frameRate: 60 } as any,
      audio: false,
    });

    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const recorder = new MediaRecorder(stream, { mimeType: mime });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.start();

    return {
      stream,
      stop: () =>
        new Promise<Blob>((resolve) => {
          recorder.onstop = () => {
            resolve(new Blob(chunks, { type: mime }));
          };
          recorder.stop();
        }),
    };
  } catch (err) {
    console.warn("[demo] screen recording denied or unavailable", err);
    return null;
  }
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------------ */
/*  Event bus — DevTools talks to DemoOverlay through these.           */
/* ------------------------------------------------------------------ */

export const DEMO_PLAY_EVENT = "wf:demo:play";
export const DEMO_STOP_EVENT = "wf:demo:stop";

export type DemoPlayDetail = {
  scriptId: string;
  record?: boolean;
};
