"use client";

import { useEffect, useRef } from "react";
import { useSignalEvents } from "../_state/signals-context";

/** Path to the notification chime, served from /public. */
const SOUND_SRC = "/sounds/notification-idea.mp3";
/** Output level for the chime (0–1). Tuned by ear — premium and
 *  audible without dominating ambient sound. */
const VOLUME = 0.55;
/** Minimum gap between chimes so rapid-fire bursts don't stack. */
const DEBOUNCE_MS = 800;

/**
 * Plays the brand notification chime on every signal event.
 *
 * Uses a pre-loaded HTMLAudioElement so the file decode happens once
 * at mount, not on each event. Each play resets currentTime to 0 so
 * a still-playing chime restarts cleanly when a new event lands
 * (subject to the debounce). Browsers block autoplay until a user
 * gesture, so the element is primed on first pointerdown/keydown.
 */
export function useSignalSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);
  const lastPlayRef = useRef(0);

  // Lazy load + gesture unlock. We construct the element synchronously
  // on mount so the metadata + first chunks are pre-fetched; the
  // unlock-on-gesture step is the "kick the wheels" that browsers
  // require before audio can play without prompting.
  useEffect(() => {
    const audio = new Audio(SOUND_SRC);
    audio.preload = "auto";
    audio.volume = VOLUME;
    audioRef.current = audio;

    const unlock = () => {
      if (unlockedRef.current) return;
      // A muted play→pause primes the element under the user-gesture
      // rule without making any noise. After this, future .play()
      // calls (post-gesture) are allowed.
      const a = audioRef.current;
      if (!a) return;
      a.muted = true;
      a.play()
        .then(() => {
          a.pause();
          a.currentTime = 0;
          a.muted = false;
          unlockedRef.current = true;
        })
        .catch(() => {
          /* Some browsers (e.g., Safari with strict autoplay) still
             refuse. The first real play call on the next gesture
             will succeed. */
        });
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useSignalEvents(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const now = performance.now();
    if (now - lastPlayRef.current < DEBOUNCE_MS) return;
    lastPlayRef.current = now;

    // Restart from the top so back-to-back events read as discrete
    // pings rather than a half-finished chime carrying over.
    audio.currentTime = 0;
    audio.play().catch(() => {
      /* Pre-gesture or aborted by a new play() — fine, ignore. */
    });
  });
}
