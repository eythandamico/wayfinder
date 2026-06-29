"use client";

import { ChatPanel } from "../ChatPanel";

/**
 * Agent tab body — full chat surface. The persistent composer in
 * MobileShell is the one input the user sees; we mount the desktop
 * ChatPanel with `embedded` so the panel doesn't render its own
 * inner composer chrome (the shell owns that). Output: the chat
 * thread, model picker, reply chips, signal cards.
 */
export function AgentTab() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ChatPanel embedded />
    </div>
  );
}
