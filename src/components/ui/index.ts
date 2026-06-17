/**
 * Wayfinder trader UI — primitives used by the /shells trading desk.
 *
 * Import via `@/components/ui` (NOT individual files) so the barrel
 * can be reorganized without touching consumers:
 *
 *   import { Button, Card, Pill, IconButton } from "@/components/ui";
 *
 * Sibling of `@/components/ds` — that's the marketing/landing tier
 * (rounded-2xl, hero-sized, shadow-rich). This module is the trader
 * tier (rounded-md, dense, aurora-aware, dark-only).
 */

export { Button, buttonVariants, type ButtonProps } from "./button";
export {
  IconButton,
  iconButtonVariants,
  type IconButtonProps,
} from "./icon-button";
export { Pill, pillVariants, type PillProps } from "./pill";
export { Card, cardVariants, type CardProps } from "./card";
export { ConfirmDialog, type ConfirmDialogProps } from "./confirm-dialog";
export { RiskCallout, type RiskCalloutProps } from "./risk-callout";
export { TextInput, type TextInputProps } from "./text-input";
export { Skeleton, type SkeletonProps } from "./skeleton";
export { Tab } from "./tab";
