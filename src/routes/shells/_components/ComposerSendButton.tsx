"use client";

import { cn } from "@/lib/utils";
import {
  ArrowUpIcon,
  MicIcon,
  MicRecordingIcon,
} from "./icons";

type Props = {
  hasContent: boolean;
  onSend: () => void;
  /** Voice-input integration — pass these to make the mic clickable. */
  recording?: boolean;
  micSupported?: boolean;
  onMicToggle?: () => void;
  /** Optional data-demo selector passthrough so the runner can find
   *  this exact button in the DOM (used by friend / token composers). */
  "data-demo"?: string;
};

/**
 * Circular composer action button. Mirrors the Agent chat's button so the
 * three chat modes (Agent, Friend/Group, Token) feel identical:
 *
 *   - empty input  → muted mic (or recording-state mic if currently recording)
 *   - has content  → primary-mint arrow up (send)
 *
 * Mic/arrow crossfade with a scale + blur so it reads as a single morphing
 * affordance rather than two separate buttons.
 */
export function ComposerSendButton({
  hasContent,
  onSend,
  recording = false,
  micSupported = false,
  onMicToggle,
  "data-demo": dataDemo,
}: Props) {
  const handleClick = hasContent ? onSend : onMicToggle;
  const disabled = !hasContent && !micSupported;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      data-demo={dataDemo}
      aria-label={
        hasContent
          ? "Send message"
          : recording
            ? "Stop voice input"
            : "Voice input"
      }
      className={cn(
        "relative flex size-9 items-center justify-center overflow-hidden rounded-full transition-[background-color,color,scale] duration-200 ease-out active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50 before:absolute before:-inset-1 before:content-['']",
        hasContent
          ? "bg-primary text-primary-foreground hover:brightness-110"
          : recording
            ? "bg-primary/80 text-primary-foreground"
            : "bg-surface-4 text-muted-foreground hover:bg-surface-4 hover:text-foreground",
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
