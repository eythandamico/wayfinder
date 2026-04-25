/**
 * All icons in the Shells app are lucide-react under the hood. These thin
 * wrappers preserve the existing import names + sizing/coloring conventions
 * so callsites don't need to change. New icons should import from lucide
 * directly.
 */
import {
  ArrowUp,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Cpu,
  ExternalLink,
  HardDrive,
  Image as LucideImage,
  Infinity as LucideInfinity,
  Key,
  Lock,
  Mic,
  MoreVertical,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STROKE = 1.5;

export function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <ChevronDown
      strokeWidth={STROKE}
      className={cn("size-3.5", className)}
    />
  );
}

export function PlusIcon() {
  return <Plus strokeWidth={STROKE} className="size-4" />;
}

export function CopyIcon() {
  return <Copy strokeWidth={STROKE} className="size-3.5" />;
}

export function ArrowUpIcon() {
  return <ArrowUp strokeWidth={2} className="size-4" />;
}

export function InfinityIcon() {
  return (
    <LucideInfinity strokeWidth={2} className="size-4 text-primary" />
  );
}

export function ImageIcon() {
  return <LucideImage strokeWidth={STROKE} className="size-4" />;
}

export function LockIcon() {
  return (
    <Lock strokeWidth={STROKE} className="size-3 text-muted-foreground" />
  );
}

export function MicIcon() {
  return <Mic strokeWidth={STROKE} className="size-4" />;
}

export function MicRecordingIcon() {
  return (
    <Mic strokeWidth={STROKE} className="size-4" fill="currentColor" />
  );
}

export function MoreIcon() {
  return <MoreVertical strokeWidth={STROKE} className="size-4" />;
}

export function CheckIcon() {
  return (
    <Check strokeWidth={2} className="size-4 text-primary" />
  );
}

export function CpuIcon() {
  return <Cpu strokeWidth={1.25} className="size-3.5" />;
}

export function DriveIcon() {
  return <HardDrive strokeWidth={1.25} className="size-3.5" />;
}

export function SearchIcon() {
  return (
    <Search
      strokeWidth={STROKE}
      className="size-4 shrink-0 text-muted-foreground"
    />
  );
}

export function ExternalLinkIcon() {
  return <ExternalLink strokeWidth={STROKE} className="size-3.5" />;
}

export function KeyIcon() {
  return (
    <Key strokeWidth={STROKE} className="size-3.5" aria-hidden />
  );
}

export function ClockIcon() {
  return (
    <Clock strokeWidth={STROKE} className="size-3" aria-hidden />
  );
}

export function BarDivider() {
  return <span aria-hidden className="h-6 w-px shrink-0 bg-white/10" />;
}
