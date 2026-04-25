/**
 * Wayfinder DS — public surface.
 *
 * Import from "@/components/ds" rather than individual files so the
 * barrel can be reorganized without touching consumers.
 */

// Layout primitives
export { Stack } from "./stack";
export { Row } from "./row";
export { Surface } from "./surface";
export { PageSection } from "./page-section";
export { Divider } from "./divider";

// Typographic primitives
export { Eyebrow } from "./eyebrow";
export { SectionHeader } from "./section-header";
export { StatRow, type Stat } from "./stat-row";

// Marketing primitives
export { MockCard } from "./mock-card";
export { StackCard } from "./stack-card";

// Interactive / chrome
export { Button, buttonVariants } from "./button";
export { Badge, badgeVariants } from "./badge";
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "./card";

// Motion
export { Reveal } from "./reveal";

// Systems
export { ACCENT_STYLES, ACCENTS, type Accent } from "./accent";
