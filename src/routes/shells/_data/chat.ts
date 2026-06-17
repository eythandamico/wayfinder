/**
 * Chat / sessions / jobs / models seed data. Lives separately from
 * market data so ChatPanel can read just this without pulling in the
 * whole MARKETS catalog.
 */
import type { ChatMessage, Job, Model, Session } from "../_types";
import {
  MORNING_BRIEF_JOB_ID,
  MORNING_BRIEF_SESSION_ID,
} from "../_lib/morning-brief";

export const SAMPLE_MESSAGES: ChatMessage[] = [
  { role: "user", text: "hey" },
  {
    role: "assistant",
    text: "Hey! How can I help you today?",
    meta: "kimi-k2.5 · 4.0s · 213 tokens",
  },
  { role: "user", text: "thunderbolts and lightning very very frightening" },
  {
    role: "assistant",
    text: "Galileo! Galileo! 🎸\nWhat can I help you with today?",
    meta: "kimi-k2.5 · 3.9s · 296 tokens",
  },
];

export const SAMPLE_SESSIONS: Session[] = [
  { id: MORNING_BRIEF_SESSION_ID, name: "Morning brief", age: "today" },
  { id: "1", name: "Greeting", age: "3d" },
  { id: "2", name: "BTC hedge research", age: "1w" },
  { id: "3", name: "Delta-neutral pack review", age: "2w" },
];

export const SAMPLE_JOBS: Job[] = [
  {
    id: MORNING_BRIEF_JOB_ID,
    name: "Morning brief",
    sessionId: MORNING_BRIEF_SESSION_ID,
    cadence: "daily 8am",
    status: "active",
    lastRunAt: "this morning",
    createdAt: "default",
  },
];

export const MODEL_PROVIDER = "Wayfinder";
export const MODELS: Model[] = [
  { id: "kimi-k2.5", label: "Kimi K2.5" },
  { id: "kimi-k2-thinking", label: "Kimi K2 Thinking", pro: true },
];
