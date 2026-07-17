import { type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  side: "left" | "right" | "center";
  title: string;
  children: ReactNode;
  className?: string;
  onClose?: () => void;
}

export function WorldPopover({ open, side, title, children, className, onClose }: Props) {
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
          "relative rounded-xl border-[2px] border-foreground bg-card/80 p-4 shadow-[6px_6px_0_0_var(--color-foreground)] backdrop-blur-md",
          className,
        )}
      >
        <div className="mb-3 flex items-center justify-between border-b-2 border-foreground/10 pb-2">
          <h2 className="font-display text-sm uppercase tracking-[0.18em] text-foreground">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[0.65rem] uppercase tracking-widest text-muted-foreground">
              walk away or
            </span>
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-md border-2 border-foreground/70 bg-background/70 p-1 text-foreground transition hover:bg-foreground hover:text-background"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
}
