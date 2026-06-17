"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  Apple,
  Clock,
  Flag,
  Hash,
  Lightbulb,
  Plane,
  Search,
  Smile,
  Sparkles,
  TreePine,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Slack-style emoji picker. Portaled to <body> so it escapes the chat
 * panel's overflow-hidden + stacking context. Positions itself off the
 * trigger element's bounding rect, with an automatic flip if there's
 * more room above than below.
 *
 *   - Category tab strip at top (one Lucide icon per section)
 *   - Search input filters by name across every section
 *   - Scrollable body with section headers and an 8-column grid
 *
 * Scope of the dataset: hand-curated set of the ~250 most common
 * chat emojis. Not literally every codepoint in Unicode but enough
 * breadth to feel like a real picker rather than a quick-react row.
 */

type Section = {
  id: string;
  label: string;
  Icon: typeof Smile;
  items: { e: string; n: string }[];
};

const SECTIONS: Section[] = [
  {
    id: "recent",
    label: "Frequently Used",
    Icon: Clock,
    items: [
      { e: "❤️", n: "heart" },
      { e: "🔥", n: "fire" },
      { e: "👀", n: "eyes" },
      { e: "💯", n: "hundred" },
      { e: "😂", n: "laughing" },
      { e: "🚀", n: "rocket" },
      { e: "💎", n: "diamond" },
      { e: "🎯", n: "target" },
      { e: "🧠", n: "brain" },
      { e: "💀", n: "skull" },
      { e: "👍", n: "thumbsup" },
      { e: "🙏", n: "pray" },
    ],
  },
  {
    id: "smileys",
    label: "Smileys & People",
    Icon: Smile,
    items: [
      { e: "😀", n: "grinning" },
      { e: "😃", n: "smiley" },
      { e: "😄", n: "smile" },
      { e: "😁", n: "beaming" },
      { e: "😆", n: "laughing" },
      { e: "🥲", n: "tear" },
      { e: "🥹", n: "holding tears" },
      { e: "😂", n: "joy laughing" },
      { e: "🤣", n: "rofl" },
      { e: "😊", n: "blush" },
      { e: "🙂", n: "slight smile" },
      { e: "😉", n: "wink" },
      { e: "😍", n: "heart eyes" },
      { e: "🥰", n: "loved" },
      { e: "😘", n: "kiss" },
      { e: "😎", n: "cool sunglasses" },
      { e: "🤩", n: "star struck" },
      { e: "🤔", n: "thinking" },
      { e: "🙄", n: "rolling eyes" },
      { e: "😬", n: "grimacing" },
      { e: "😴", n: "sleeping" },
      { e: "🤯", n: "mind blown" },
      { e: "😱", n: "scream shocked" },
      { e: "🥺", n: "pleading" },
      { e: "😭", n: "crying" },
      { e: "😢", n: "sad" },
      { e: "🤧", n: "sneezing" },
      { e: "🤐", n: "zipped lips" },
      { e: "😅", n: "sweat smile" },
      { e: "😏", n: "smirk" },
      { e: "😐", n: "neutral" },
      { e: "😑", n: "expressionless" },
      { e: "🤨", n: "raised eyebrow" },
      { e: "🥶", n: "cold freezing" },
      { e: "🥵", n: "hot" },
      { e: "🤡", n: "clown" },
      { e: "💀", n: "skull" },
      { e: "👻", n: "ghost" },
      { e: "👽", n: "alien" },
      { e: "🤖", n: "robot" },
      { e: "👍", n: "thumbsup" },
      { e: "👎", n: "thumbsdown" },
      { e: "👏", n: "clap" },
      { e: "🙌", n: "raised hands celebrate" },
      { e: "🤝", n: "handshake" },
      { e: "🙏", n: "pray thanks" },
      { e: "✌️", n: "peace" },
      { e: "🤞", n: "fingers crossed" },
      { e: "👌", n: "ok hand" },
      { e: "🤙", n: "shaka call" },
      { e: "💪", n: "muscle flex" },
      { e: "🧠", n: "brain" },
      { e: "👀", n: "eyes" },
    ],
  },
  {
    id: "nature",
    label: "Animals & Nature",
    Icon: TreePine,
    items: [
      { e: "🐶", n: "dog" },
      { e: "🐱", n: "cat" },
      { e: "🦁", n: "lion" },
      { e: "🐻", n: "bear" },
      { e: "🐼", n: "panda" },
      { e: "🐨", n: "koala" },
      { e: "🐯", n: "tiger" },
      { e: "🦊", n: "fox" },
      { e: "🐵", n: "monkey" },
      { e: "🦍", n: "gorilla ape" },
      { e: "🐺", n: "wolf" },
      { e: "🐗", n: "boar" },
      { e: "🐴", n: "horse" },
      { e: "🦄", n: "unicorn" },
      { e: "🐢", n: "turtle" },
      { e: "🐙", n: "octopus" },
      { e: "🐋", n: "whale" },
      { e: "🦈", n: "shark" },
      { e: "🦅", n: "eagle" },
      { e: "🦆", n: "duck" },
      { e: "🐝", n: "bee" },
      { e: "🦋", n: "butterfly" },
      { e: "🌸", n: "blossom flower" },
      { e: "🌹", n: "rose" },
      { e: "🌻", n: "sunflower" },
      { e: "🌳", n: "tree" },
      { e: "🌲", n: "pine" },
      { e: "🌵", n: "cactus" },
      { e: "🍄", n: "mushroom" },
      { e: "🍁", n: "maple" },
      { e: "🌞", n: "sun" },
      { e: "🌜", n: "moon" },
      { e: "⭐", n: "star" },
      { e: "🌟", n: "glow star" },
      { e: "⚡", n: "bolt lightning" },
      { e: "🔥", n: "fire" },
      { e: "💧", n: "drop water" },
      { e: "🌊", n: "wave water" },
      { e: "🌍", n: "earth globe" },
      { e: "🌈", n: "rainbow" },
    ],
  },
  {
    id: "food",
    label: "Food & Drink",
    Icon: Apple,
    items: [
      { e: "🍎", n: "apple" },
      { e: "🍊", n: "orange" },
      { e: "🍋", n: "lemon" },
      { e: "🍌", n: "banana" },
      { e: "🍉", n: "watermelon" },
      { e: "🍇", n: "grapes" },
      { e: "🍓", n: "strawberry" },
      { e: "🫐", n: "blueberries" },
      { e: "🥑", n: "avocado" },
      { e: "🌶️", n: "chili pepper" },
      { e: "🌽", n: "corn" },
      { e: "🥕", n: "carrot" },
      { e: "🥐", n: "croissant" },
      { e: "🍞", n: "bread" },
      { e: "🧀", n: "cheese" },
      { e: "🥩", n: "steak" },
      { e: "🍗", n: "chicken leg" },
      { e: "🍔", n: "burger" },
      { e: "🍟", n: "fries" },
      { e: "🍕", n: "pizza" },
      { e: "🌮", n: "taco" },
      { e: "🌯", n: "burrito" },
      { e: "🍣", n: "sushi" },
      { e: "🍜", n: "ramen noodles" },
      { e: "🍝", n: "spaghetti pasta" },
      { e: "🍪", n: "cookie" },
      { e: "🎂", n: "cake birthday" },
      { e: "🍩", n: "donut" },
      { e: "🍫", n: "chocolate" },
      { e: "☕", n: "coffee" },
      { e: "🍵", n: "tea" },
      { e: "🍺", n: "beer" },
      { e: "🍷", n: "wine" },
      { e: "🥂", n: "cheers champagne" },
      { e: "🍸", n: "cocktail martini" },
    ],
  },
  {
    id: "activities",
    label: "Activities",
    Icon: Trophy,
    items: [
      { e: "⚽", n: "soccer ball" },
      { e: "🏀", n: "basketball" },
      { e: "🏈", n: "football" },
      { e: "⚾", n: "baseball" },
      { e: "🎾", n: "tennis" },
      { e: "🏐", n: "volleyball" },
      { e: "🏓", n: "ping pong" },
      { e: "🥊", n: "boxing" },
      { e: "🎯", n: "target dart" },
      { e: "🎮", n: "gaming" },
      { e: "🎲", n: "dice" },
      { e: "🃏", n: "card joker" },
      { e: "🎰", n: "slot machine" },
      { e: "🎨", n: "art palette" },
      { e: "🎭", n: "theatre" },
      { e: "🎬", n: "movie clapper" },
      { e: "🎤", n: "mic" },
      { e: "🎧", n: "headphones" },
      { e: "🎸", n: "guitar" },
      { e: "🥁", n: "drums" },
      { e: "🏆", n: "trophy" },
      { e: "🥇", n: "gold medal" },
      { e: "🥈", n: "silver medal" },
      { e: "🥉", n: "bronze medal" },
    ],
  },
  {
    id: "travel",
    label: "Travel & Places",
    Icon: Plane,
    items: [
      { e: "🚗", n: "car" },
      { e: "🚕", n: "taxi" },
      { e: "🚙", n: "suv" },
      { e: "🚌", n: "bus" },
      { e: "🚓", n: "police car" },
      { e: "🚑", n: "ambulance" },
      { e: "🚒", n: "fire truck" },
      { e: "🚜", n: "tractor" },
      { e: "🏎️", n: "racecar" },
      { e: "🚲", n: "bike" },
      { e: "🛵", n: "scooter" },
      { e: "🏍️", n: "motorcycle" },
      { e: "✈️", n: "plane" },
      { e: "🚀", n: "rocket launch" },
      { e: "🛸", n: "ufo" },
      { e: "🚁", n: "helicopter" },
      { e: "🚂", n: "train" },
      { e: "🚆", n: "fast train" },
      { e: "⛵", n: "sailboat" },
      { e: "🚢", n: "ship" },
      { e: "🏝️", n: "island" },
      { e: "🏖️", n: "beach" },
      { e: "🌋", n: "volcano" },
      { e: "🗻", n: "mountain fuji" },
      { e: "🏔️", n: "snow mountain" },
      { e: "🏙️", n: "cityscape" },
      { e: "🌆", n: "sunset city" },
      { e: "🌃", n: "night city" },
    ],
  },
  {
    id: "objects",
    label: "Objects & Money",
    Icon: Lightbulb,
    items: [
      { e: "💎", n: "diamond gem" },
      { e: "💰", n: "money bag" },
      { e: "💸", n: "money flying" },
      { e: "💵", n: "dollar cash" },
      { e: "💴", n: "yen cash" },
      { e: "💶", n: "euro cash" },
      { e: "💷", n: "pound cash" },
      { e: "🪙", n: "coin" },
      { e: "💳", n: "credit card" },
      { e: "🧾", n: "receipt" },
      { e: "🏦", n: "bank" },
      { e: "📈", n: "chart up" },
      { e: "📉", n: "chart down" },
      { e: "📊", n: "bar chart" },
      { e: "💻", n: "laptop" },
      { e: "🖥️", n: "desktop" },
      { e: "⌨️", n: "keyboard" },
      { e: "🖱️", n: "mouse" },
      { e: "📱", n: "phone" },
      { e: "🔋", n: "battery" },
      { e: "💡", n: "lightbulb idea" },
      { e: "🔑", n: "key" },
      { e: "🔒", n: "lock" },
      { e: "🔓", n: "unlock" },
      { e: "📝", n: "memo notes" },
      { e: "📋", n: "clipboard" },
      { e: "📌", n: "pin" },
      { e: "🎁", n: "gift present" },
      { e: "🛒", n: "cart" },
      { e: "📦", n: "package" },
    ],
  },
  {
    id: "symbols",
    label: "Symbols",
    Icon: Hash,
    items: [
      { e: "❤️", n: "red heart" },
      { e: "🧡", n: "orange heart" },
      { e: "💛", n: "yellow heart" },
      { e: "💚", n: "green heart" },
      { e: "💙", n: "blue heart" },
      { e: "💜", n: "purple heart" },
      { e: "🖤", n: "black heart" },
      { e: "🤍", n: "white heart" },
      { e: "💔", n: "broken heart" },
      { e: "❣️", n: "heart exclamation" },
      { e: "💕", n: "two hearts" },
      { e: "💗", n: "growing heart" },
      { e: "💯", n: "hundred perfect" },
      { e: "✅", n: "check yes" },
      { e: "❌", n: "x no" },
      { e: "⚠️", n: "warning" },
      { e: "🚫", n: "no entry" },
      { e: "🔔", n: "bell ring" },
      { e: "🔕", n: "bell off" },
      { e: "♻️", n: "recycle" },
      { e: "🆕", n: "new" },
      { e: "🆗", n: "ok square" },
      { e: "🆙", n: "up arrow text" },
      { e: "🔥", n: "fire flame" },
      { e: "⭐", n: "star yellow" },
      { e: "🌟", n: "glow star" },
      { e: "💢", n: "anger" },
      { e: "💥", n: "boom collision" },
      { e: "🎉", n: "party tada" },
      { e: "🎊", n: "confetti" },
    ],
  },
  {
    id: "flags",
    label: "Flags",
    Icon: Flag,
    items: [
      { e: "🏁", n: "checkered flag finish" },
      { e: "🚩", n: "red flag" },
      { e: "🏳️", n: "white flag" },
      { e: "🏴", n: "black flag" },
      { e: "🏳️‍🌈", n: "rainbow pride" },
      { e: "🏴‍☠️", n: "pirate jolly roger" },
      { e: "🇺🇸", n: "us united states america" },
      { e: "🇬🇧", n: "uk united kingdom" },
      { e: "🇪🇺", n: "eu europe" },
      { e: "🇯🇵", n: "japan" },
      { e: "🇨🇳", n: "china" },
      { e: "🇰🇷", n: "korea south" },
      { e: "🇫🇷", n: "france" },
      { e: "🇩🇪", n: "germany" },
      { e: "🇮🇳", n: "india" },
    ],
  },
];

type Props = {
  open: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  onSelect: (emoji: string) => void;
  onOpenChange: (open: boolean) => void;
};

const PICKER_WIDTH = 340;
const PICKER_HEIGHT = 420;

export function EmojiPicker({ open, triggerRef, onSelect, onOpenChange }: Props) {
  // Stable close alias so effect deps below stay clean — without
  // useCallback the local arrow gets a new identity per render and
  // re-binds the keydown listener.
  const onClose = useCallback(() => onOpenChange(false), [onOpenChange]);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Reposition + reset on open. Prefer above the trigger, flip to below
  // if there isn't enough headroom. Constrain to viewport.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const above = rect.top - 8;
    const below = window.innerHeight - rect.bottom - 8;
    const top =
      above >= PICKER_HEIGHT
        ? Math.max(8, rect.top - PICKER_HEIGHT - 8)
        : below >= PICKER_HEIGHT
          ? rect.bottom + 8
          : Math.max(8, window.innerHeight - PICKER_HEIGHT - 8);
    const left = Math.max(
      8,
      Math.min(rect.right - PICKER_WIDTH, window.innerWidth - PICKER_WIDTH - 8),
    );
    setPos({ top, left });
    setQuery("");
    setActiveId(SECTIONS[0].id);
  }, [open, triggerRef]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Filtered view when the user is searching.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const all = SECTIONS.flatMap((s) => s.items);
    const seen = new Set<string>();
    return all.filter((item) => {
      if (seen.has(item.e)) return false;
      if (!item.n.toLowerCase().includes(q)) return false;
      seen.add(item.e);
      return true;
    });
  }, [query]);

  const onTab = (id: string) => {
    setActiveId(id);
    sectionRefs.current[id]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (!open || !pos) return null;

  return createPortal(
    <>
      {/* Click-outside scrim. Clicking anywhere outside the picker
          closes it (including clicking the trigger again — that's
          treated as a close, not a re-open). */}
      <div
        onClick={onClose}
        aria-hidden
        className="fixed inset-0 z-[var(--z-cursor-overlay)]"
      />
      <div
        role="dialog"
        aria-label="Emoji picker"
        onClick={(e) => e.stopPropagation()}
        className="fixed z-[201] flex flex-col overflow-hidden rounded-lg bg-card backdrop-blur-md ring-1 ring-inset ring-white/[0.06] shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        style={{
          top: pos.top,
          left: pos.left,
          width: PICKER_WIDTH,
          height: PICKER_HEIGHT,
        }}
      >
        {/* Category tabs */}
        <div className="flex shrink-0 items-center gap-0.5 border-b border-white/[0.05] px-2 py-1.5">
          {SECTIONS.map((s) => {
            const active = activeId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-label={s.label}
                onClick={() => onTab(s.id)}
                className={cn(
                  "relative inline-flex size-7 items-center justify-center rounded-md transition-[background-color,color] duration-150 ease-out",
                  active
                    ? "bg-surface-2 text-foreground"
                    : "text-muted-foreground hover:bg-surface-1 hover:text-foreground",
                )}
              >
                <s.Icon
                  strokeWidth={1.75}
                  className="size-3.5"
                  aria-hidden
                />
                {active && (
                  <span
                    aria-hidden
                    className="absolute -bottom-1.5 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full bg-primary"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="shrink-0 border-b border-white/[0.05] px-2 py-2">
          <div className="flex items-center gap-2 rounded-md bg-surface-1 px-2.5 py-1.5">
            <Search
              strokeWidth={1.75}
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all emoji"
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Body */}
        <div
          ref={scrollRef}
          className="scroll-thin min-h-0 flex-1 overflow-y-auto px-2 py-2"
        >
          {filtered ? (
            <SearchResults items={filtered} onSelect={onSelect} />
          ) : (
            SECTIONS.map((s) => (
              <SectionBlock
                key={s.id}
                section={s}
                onSelect={onSelect}
                bindRef={(el) => {
                  sectionRefs.current[s.id] = el;
                }}
              />
            ))
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

function SectionBlock({
  section,
  onSelect,
  bindRef,
}: {
  section: Section;
  onSelect: (emoji: string) => void;
  bindRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={bindRef} className="mb-3">
      <div className="px-1 pb-1 pt-0.5 text-micro uppercase tracking-[0.16em] text-muted-foreground">
        {section.label}
      </div>
      <EmojiGrid items={section.items} onSelect={onSelect} />
    </div>
  );
}

function SearchResults({
  items,
  onSelect,
}: {
  items: { e: string; n: string }[];
  onSelect: (emoji: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 px-6 py-12 text-center text-muted-foreground">
        <Sparkles strokeWidth={1.5} className="size-5" aria-hidden />
        <p className="text-body text-foreground">No matches</p>
        <p className="text-caption text-muted-foreground">
          Try a different keyword.
        </p>
      </div>
    );
  }
  return (
    <div>
      <div className="px-1 pb-1 pt-0.5 text-micro uppercase tracking-[0.16em] text-muted-foreground">
        Results
      </div>
      <EmojiGrid items={items} onSelect={onSelect} />
    </div>
  );
}

function EmojiGrid({
  items,
  onSelect,
}: {
  items: { e: string; n: string }[];
  onSelect: (emoji: string) => void;
}) {
  return (
    <div className="grid grid-cols-8 gap-0.5">
      {items.map((item) => (
        <button
          key={item.e}
          type="button"
          title={item.n}
          aria-label={`React with ${item.n}`}
          onClick={() => onSelect(item.e)}
          className="inline-flex size-9 items-center justify-center rounded-sm text-title leading-none transition-[background-color,scale] duration-150 ease-out hover:bg-surface-2 active:scale-[0.96]"
        >
          {item.e}
        </button>
      ))}
    </div>
  );
}
