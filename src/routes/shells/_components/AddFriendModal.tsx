"use client";

import { useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Check, UserPlus, X } from "lucide-react";
import Jazzicon from "react-jazzicon";
import { cn } from "@/lib/utils";
import { useFriends } from "../_state/shells-context";
import { SearchIcon } from "./icons";

/**
 * Discoverable traders the user can add as friends. Mock pool —
 * stays in sync with the suggested-for-you cards in FriendsPanel
 * so both surfaces source from one place. Each entry carries an
 * optional `reason` that surfaces both here (subtitle on each row)
 * and in the suggestions carousel.
 */
export type Discoverable = {
  id: string;
  name: string;
  handle: string;
  seed: number;
  reason?: string;
};

export const DISCOVERABLE: Discoverable[] = [
  { id: "jg", name: "jg", handle: "@jotagezin", seed: 9201, reason: "Top trader · 24h" },
  { id: "xventures", name: "X Ventures", handle: "@XVentures", seed: 8311, reason: "3 mutual friends" },
  { id: "watery", name: "WaterySimpleBobolink", handle: "@WaterySimpleBobolink", seed: 7842, reason: "Follows BTC, ETH" },
  { id: "nfy", name: "nfy", handle: "@nfydefi", seed: 6789, reason: "On a hot streak" },
  { id: "doc", name: "Ðoc", handle: "@doc", seed: 5432, reason: "Verified · 12k followers" },
  { id: "humble", name: "HumbleUnderGod", handle: "@HumbleUnderGod", seed: 4567, reason: "Suggested for you" },
  { id: "shortmemes", name: "lshortMemes", handle: "@KyleBands1", seed: 3456, reason: "2 mutual friends" },
  { id: "tommy", name: "tommy", handle: "@tommy", seed: 8421, reason: "Followed by loomdart" },
  { id: "smolting", name: "smolting", handle: "@smolting", seed: 4421, reason: "New on Wayfinder" },
  { id: "vaultflows", name: "vault.flows", handle: "@vaultflows", seed: 6624, reason: "Trades same tokens" },
];

/**
 * Add-friend modal — opens from the FriendsPanel header. Same chrome
 * as the Deposit modal (rounded-2xl bg-card with ring + blurred
 * backdrop). Search input filters the discoverable pool by name or
 * handle; per-row Add button flips to a quiet "Added" confirmation
 * (with Remove on hover) so the user can keep browsing without
 * losing context.
 */
export function AddFriendModal() {
  const {
    addFriendOpen,
    closeAddFriend,
    addFriend,
    removeFriend,
    isFriend,
  } = useFriends();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DISCOVERABLE;
    return DISCOVERABLE.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.handle.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <Dialog.Root
      open={addFriendOpen}
      onOpenChange={(o) => (o ? null : closeAddFriend())}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[var(--z-modal-bg)] bg-background/70 backdrop-blur-[3px] transition-opacity duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-[var(--z-modal)] flex w-[min(94vw,520px)] max-h-[min(80vh,640px)] -translate-x-1/2 -translate-y-1/2 origin-center flex-col overflow-hidden rounded-2xl bg-card backdrop-blur-md ring-1 ring-inset ring-white/[0.06] shadow-2xl transition-[opacity,transform] duration-200 ease-[var(--ease-strong)] data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.05] px-4 py-3">
            <Dialog.Title className="text-body font-semibold text-foreground">
              Add friend
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              onClick={closeAddFriend}
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <X strokeWidth={1.75} className="size-4" aria-hidden />
            </Dialog.Close>
          </div>

          {/* Search — flush, no input chrome, divider below */}
          <div className="flex items-center gap-3 border-b border-white/[0.05] px-4 py-2.5">
            <SearchIcon />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or handle"
              autoFocus
              className="flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
              aria-label="Search discoverable traders"
            />
          </div>

          {/* Results */}
          <div className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-body text-muted-foreground">
                No one matches &ldquo;{query}&rdquo;.
              </div>
            ) : (
              filtered.map((d) => (
                <DiscoverRow
                  key={d.id}
                  discoverable={d}
                  added={isFriend(d.id)}
                  onAdd={() => addFriend(d.id)}
                  onRemove={() => removeFriend(d.id)}
                />
              ))
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DiscoverRow({
  discoverable,
  added,
  onAdd,
  onRemove,
}: {
  discoverable: Discoverable;
  added: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="group flex w-full items-center gap-3 px-4 py-2.5">
      <span
        aria-hidden
        className="inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full"
      >
        <Jazzicon diameter={36} seed={discoverable.seed} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
        <span className="truncate text-body font-medium text-foreground">
          {discoverable.name}
        </span>
        <span className="truncate text-caption text-muted-foreground">
          {discoverable.handle}
          {discoverable.reason ? ` · ${discoverable.reason}` : ""}
        </span>
      </div>
      {added ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove friend"
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-3 text-body font-medium transition-[background-color,color] duration-150 ease-out",
            "bg-surface-3 text-foreground hover:bg-surface-4 hover:text-tone-down",
          )}
        >
          {/* Default: Added with check. On hover the row label flips to
           *  "Remove" so the destructive action reads as intentional. */}
          <Check
            strokeWidth={2}
            className="size-3.5 text-primary group-hover:hidden"
            aria-hidden
          />
          <span className="group-hover:hidden">Added</span>
          <span className="hidden group-hover:inline">Remove</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add ${discoverable.name}`}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-surface-3 px-3 text-body font-medium text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-surface-4 active:scale-[0.96]"
        >
          <UserPlus strokeWidth={1.75} className="size-3.5" aria-hidden />
          Add
        </button>
      )}
    </div>
  );
}
