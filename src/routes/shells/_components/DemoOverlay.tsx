"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEMO_PLAY_EVENT,
  DEMO_STOP_EVENT,
  DemoRunner,
  INITIAL_CURSOR,
  downloadBlob,
  startRecording,
  type CursorState,
  type DemoPlayDetail,
  type Recording,
} from "../_lib/demo";
import { DEMO_SCRIPTS } from "../_lib/demo-scripts";
import { DemoCursor } from "./DemoCursor";

/** Listens for `wf:demo:play` / `wf:demo:stop` events on the window
 *  and drives a {@link DemoRunner}. When a play event arrives with
 *  `record: true`, prompts for screen capture, records the run, and
 *  downloads the resulting webm when the runner completes. */
export function DemoOverlay() {
  const [cursor, setCursor] = useState<CursorState>(INITIAL_CURSOR);
  const runnerRef = useRef<DemoRunner | null>(null);
  const recordingRef = useRef<Recording | null>(null);
  // Holds the removeEventListener pair for the per-track "ended"
  // handlers attached when a recording starts. Cleared by
  // cleanupRecording so we don't leak listeners on stopped tracks.
  const detachTrackListenersRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const setDevToolsHidden = (hidden: boolean) => {
      window.dispatchEvent(
        new CustomEvent("wf:devtools:hide", { detail: { hidden } }),
      );
    };

    const cleanupRecording = async (download: boolean) => {
      const recording = recordingRef.current;
      if (!recording) return;
      recordingRef.current = null;
      detachTrackListenersRef.current?.();
      detachTrackListenersRef.current = null;
      try {
        const blob = await recording.stop();
        if (download) {
          downloadBlob(blob, `wayfinder-demo-${Date.now()}.webm`);
        }
      } finally {
        recording.stream.getTracks().forEach((t) => t.stop());
        setDevToolsHidden(false);
      }
    };

    const onPlay = async (e: Event) => {
      const detail = (e as CustomEvent<DemoPlayDetail>).detail;
      const entry = DEMO_SCRIPTS[detail?.scriptId];
      if (!entry || entry.steps.length === 0) {
        console.warn(`[demo] script "${detail?.scriptId}" missing or empty`);
        return;
      }

      // Cancel any prior run + recording before starting fresh.
      runnerRef.current?.stop();
      runnerRef.current = null;
      await cleanupRecording(false);

      if (detail.record) {
        // getDisplayMedia requires a user gesture — DevTools' click is
        // the source one, and we're still inside that microtask chain.
        const recording = await startRecording();
        if (recording) {
          recordingRef.current = recording;
          // Hide the DevTools button while recording so the captured
          // video doesn't include the wrench in the corner.
          setDevToolsHidden(true);
          // If the user stops sharing from the browser chrome, the
          // tracks end. Treat that as a stop signal so we still
          // download whatever was captured. Handler is named + the
          // detach is held on a ref so `cleanupRecording` can pair
          // the removeEventListener with the original add, matching
          // the rest of this effect's add/remove discipline.
          const onTrackEnded = () => {
            void cleanupRecording(true);
            runnerRef.current?.stop();
            runnerRef.current = null;
          };
          const tracks = recording.stream.getVideoTracks();
          tracks.forEach((t) => t.addEventListener("ended", onTrackEnded));
          detachTrackListenersRef.current = () =>
            tracks.forEach((t) =>
              t.removeEventListener("ended", onTrackEnded),
            );
        }
      }

      const runner = new DemoRunner(entry.steps, setCursor, () => {
        runnerRef.current = null;
        void cleanupRecording(true);
      });
      runner.start();
      runnerRef.current = runner;
    };

    const onStop = () => {
      runnerRef.current?.stop();
      runnerRef.current = null;
      void cleanupRecording(true);
    };

    window.addEventListener(DEMO_PLAY_EVENT, onPlay as EventListener);
    window.addEventListener(DEMO_STOP_EVENT, onStop);
    return () => {
      window.removeEventListener(DEMO_PLAY_EVENT, onPlay as EventListener);
      window.removeEventListener(DEMO_STOP_EVENT, onStop);
      runnerRef.current?.stop();
      runnerRef.current = null;
      void cleanupRecording(false);
    };
  }, []);

  return <DemoCursor state={cursor} />;
}
