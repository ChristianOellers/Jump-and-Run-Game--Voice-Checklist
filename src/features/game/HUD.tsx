import { useEffect, useRef, useState } from "react";
import { Settings2, History, RefreshCw } from "lucide-react";
import { useGameStore, onPop, type FloatingPop } from "./useGameStore";
import { shrineStage } from "./GameCanvas";
import { WorldPopover } from "./WorldPopover";
import { ActivityPanel } from "@/features/activity/ActivityPanel";
import { SettingsPanel } from "@/features/settings/SettingsPanel";
import { Button } from "@/components/ui/button";

const POP_LIFE = 900;

export function HUD() {
  const steps = useGameStore((s) => s.steps);
  const words = useGameStore((s) => s.words);
  const ticks = useGameStore((s) => s.ticks);
  const seeds = useGameStore((s) => s.seeds);
  const treeGrowth = useGameStore((s) => s.treeGrowth);
  const regen = useGameStore((s) => s.regenLevel);
  const [menu, setMenu] = useState<"none" | "log" | "setup">("none");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const popsRef = useRef<FloatingPop[]>([]);

  useEffect(() => {
    const off = onPop((p) => popsRef.current.push(p));
    let raf = 0;
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      c.width = window.innerWidth * dpr;
      c.height = window.innerHeight * dpr;
      c.style.width = window.innerWidth + "px";
      c.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      const now = performance.now();
      ctx.clearRect(0, 0, c.width, c.height);
      popsRef.current = popsRef.current.filter((p) => now - p.born < POP_LIFE);
      ctx.textAlign = "center";
      for (const p of popsRef.current) {
        const t = (now - p.born) / POP_LIFE;
        const alpha = 1 - t;
        const y = p.y - t * 60;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.font = "900 22px 'Archivo Black', system-ui, sans-serif";
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 3;
        ctx.strokeText(p.text, p.x, y);
        ctx.fillText(p.text, p.x, y);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      off();
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-20"
        aria-hidden="true"
      />

      {/* Top-left counters */}
      <div className="pointer-events-none fixed left-4 top-4 z-30 flex flex-col gap-1">
        <div className="pointer-events-auto rounded-lg border-2 border-foreground bg-card px-3 py-2 shadow-[3px_3px_0_0_var(--color-foreground)]">
          <div className="flex items-baseline gap-3 font-display text-sm">
            <Counter label="STEP" value={steps} />
            <Counter label="WORD" value={words} />
            <Counter label="TICK" value={ticks} />
          </div>
        </div>
        <div className="pointer-events-auto rounded-lg border-2 border-foreground bg-primary px-3 py-2 shadow-[3px_3px_0_0_var(--color-foreground)]">
          <div className="flex items-baseline gap-3 font-display text-sm text-primary-foreground">
            <Counter label="SEED" value={seeds} light />
            <Counter label="TREE" value={treeGrowth} light />
          </div>
        </div>
      </div>

      {/* Top-right menu buttons */}
      <div className="pointer-events-auto fixed right-4 top-4 z-30 flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={regen}
          className="border-2 border-foreground bg-card shadow-[3px_3px_0_0_var(--color-foreground)]"
          aria-label="Regenerate world"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          variant={menu === "log" ? "default" : "outline"}
          size="icon"
          onClick={() => setMenu(menu === "log" ? "none" : "log")}
          className="border-2 border-foreground bg-card shadow-[3px_3px_0_0_var(--color-foreground)]"
          aria-label="Activity log"
        >
          <History className="h-4 w-4" />
        </Button>
        <Button
          variant={menu === "setup" ? "default" : "outline"}
          size="icon"
          onClick={() => setMenu(menu === "setup" ? "none" : "setup")}
          className="border-2 border-foreground bg-card shadow-[3px_3px_0_0_var(--color-foreground)]"
          aria-label="Settings"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      <WorldPopover open={menu === "log"} side="right" title="Activity Log">
        <ActivityPanel />
      </WorldPopover>
      <WorldPopover open={menu === "setup"} side="right" title="Settings">
        <SettingsPanel />
      </WorldPopover>

      {/* Bottom hint bar */}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-30 -translate-x-1/2">
        <div className="rounded-full border-2 border-foreground bg-card px-4 py-1.5 font-display text-[0.7rem] uppercase tracking-[0.22em] text-foreground shadow-[3px_3px_0_0_var(--color-foreground)]">
          ← → move · space jump · walk to a zone
        </div>
      </div>

      {/* Mobile controls */}
      <MobileControls />
    </>
  );
}

function Counter({ label, value, light }: { label: string; value: number; light?: boolean }) {
  return (
    <span className="flex items-baseline gap-1">
      <span
        className={
          "text-[0.6rem] uppercase tracking-widest " +
          (light ? "text-primary-foreground/70" : "text-muted-foreground")
        }
      >
        {label}
      </span>
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

function MobileControls() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-16 z-30 flex justify-between px-4 sm:hidden">
      <div className="pointer-events-auto flex gap-2">
        <TouchBtn code="ArrowLeft" label="◄" />
        <TouchBtn code="ArrowRight" label="►" />
      </div>
      <div className="pointer-events-auto">
        <TouchBtn code="Space" label="JUMP" wide />
      </div>
    </div>
  );
}

function TouchBtn({ code, label, wide }: { code: string; label: string; wide?: boolean }) {
  const fire = (down: boolean) => {
    const type = down ? "keydown" : "keyup";
    window.dispatchEvent(new KeyboardEvent(type, { code, key: code }));
  };
  return (
    <button
      onTouchStart={(e) => {
        e.preventDefault();
        fire(true);
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        fire(false);
      }}
      onMouseDown={() => fire(true)}
      onMouseUp={() => fire(false)}
      onMouseLeave={() => fire(false)}
      className={
        "rounded-lg border-2 border-foreground bg-card font-display text-lg text-foreground shadow-[3px_3px_0_0_var(--color-foreground)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none " +
        (wide ? "px-6 py-3" : "h-12 w-12")
      }
      aria-label={label}
    >
      {label}
    </button>
  );
}
