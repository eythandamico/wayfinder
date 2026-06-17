/**
 * v2 chat contacts. Agent is always first and always pinned.
 *
 * `seed` drives the Jazzicon for friends. Stable string → number hash so
 * the avatar stays the same across renders.
 */

export type ContactKind = "agent" | "friend" | "group" | "token";

export type Contact = {
  id: string;
  kind: ContactKind;
  name: string;
  handle?: string;
  verified?: boolean;
  unread?: number;
  /** Group / token: member count. */
  members?: number;
  /** Friend-only: integer seed for jazzicon fallback. */
  seed?: number;
  /** Optional avatar URL — when set, ContactAvatar renders this as
   *  a photo instead of falling back to the jazzicon. */
  avatar?: string;
  /** Token-only: market glyph + colors (mirrors the chart's token chip). */
  iconChar?: string;
  iconBg?: string;
  iconFg?: string;
  /**
   * Token-only: this chat is in the strip because the chart is currently
   * focused on this market. It will disappear when the user switches the
   * chart, *unless* they send a message — at which point it becomes pinned.
   */
  provisional?: boolean;
};

const seed = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

export const AGENT_CONTACT: Contact = {
  id: "agent",
  kind: "agent",
  name: "Wayfinder",
  handle: "@agent",
};

export const CONTACTS: Contact[] = [
  AGENT_CONTACT,
  {
    id: "alpha-hunters",
    kind: "group",
    name: "0xResearch",
    members: 12,
    unread: 30,
  },
  {
    id: "kalos",
    kind: "friend",
    name: "loomdart",
    handle: "@loomdart",
    verified: true,
    seed: seed("kalos"),
    avatar: "https://i.pravatar.cc/200?img=12",
  },
  {
    id: "eythan",
    kind: "friend",
    name: "frog_pilled",
    handle: "@frogpilled",
    seed: seed("eythan"),
    avatar: "https://i.pravatar.cc/200?img=33",
  },
  {
    id: "jcrew",
    kind: "friend",
    name: "wassie.eth",
    handle: "@wassielawyer",
    verified: true,
    unread: 1,
    seed: seed("jcrew"),
    avatar: "https://i.pravatar.cc/200?img=68",
  },
  {
    id: "funding-capture",
    kind: "group",
    name: "funding.captors",
    members: 4,
  },
  {
    id: "byokes",
    kind: "friend",
    name: "Tetranode",
    handle: "@Tetranode",
    unread: 1,
    seed: seed("byokes"),
    avatar: "https://i.pravatar.cc/200?img=47",
  },
  {
    id: "bounty",
    kind: "friend",
    name: "GCR",
    handle: "@GiganticRebirth",
    verified: true,
    seed: seed("bounty"),
    avatar: "https://i.pravatar.cc/200?img=22",
  },
  {
    id: "deuce",
    kind: "friend",
    name: "DCFGod",
    handle: "@dcfgod",
    seed: seed("deuce"),
    avatar: "https://i.pravatar.cc/200?img=53",
  },
  {
    id: "ryzla",
    kind: "friend",
    name: "0xfoobar",
    handle: "@0xfoobar",
    verified: true,
    seed: seed("ryzla"),
    avatar: "https://i.pravatar.cc/200?img=64",
  },
];
