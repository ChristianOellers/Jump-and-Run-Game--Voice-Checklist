import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  side: "left" | "right" | "center";
  title: string;
  children: ReactNode;
  className?: string;
}

export function WorldPopover({ open, side, title, children, className }: Props) {
  const position =
    side === "left"
      ? "left-4 sm:left-8"
      : side === "right"
        ? "right-4 sm:right-8"
        : "left-1/2 -translate-x-1/2";
  const origin =
    side === "left" ? "origin-left" : side === "right" ? "origin-right" : "origin-top";

  return (
    <div
      className={cn(
        "pointer-events-none fixed top-20 z-30 w-[min(92vw,380px)] transition-all duration-300 ease-out",
        position,
        origin,
        open
          ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
          : "translate-y-2 scale-95 opacity-0",
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "relative rounded-xl border-[2px] border-foreground bg-card p-4 shadow-[6px_6px_0_0_var(--color-foreground)]",
          className,
        )}
      >
        <div className="mb-3 flex items-center justify-between border-b-2 border-foreground/10 pb-2">
          <h2 className="font-display text-sm uppercase tracking-[0.18em] text-foreground">
            {title}
          </h2>
          <span className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
            {side === "left" ? "◄ walk away to close" : side === "right" ? "walk away to close ►" : "menu"}
          </span>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
}
