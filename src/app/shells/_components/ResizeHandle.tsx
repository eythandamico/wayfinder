import { Separator } from "react-resizable-panels";
import { cn } from "@/lib/utils";

export function ResizeHandle({
  orientation,
}: {
  orientation: "horizontal" | "vertical";
}) {
  return (
    <Separator
      aria-label={`Resize ${orientation === "horizontal" ? "columns" : "rows"}`}
      className={cn(
        "group relative outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-inset",
        orientation === "horizontal"
          ? "!w-1 hover:bg-white/10 data-[separator=active]:bg-primary/30"
          : "!h-1 hover:bg-white/10 data-[separator=active]:bg-primary/30",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "absolute rounded-full bg-transparent transition-colors group-hover:bg-white/20 group-data-[separator=active]:bg-primary/60",
          orientation === "horizontal"
            ? "left-1/2 top-1/2 h-10 w-[3px] -translate-x-1/2 -translate-y-1/2"
            : "left-1/2 top-1/2 h-[3px] w-10 -translate-x-1/2 -translate-y-1/2",
        )}
      />
    </Separator>
  );
}
