import { useEffect, useRef } from "react";
import { useGameStore, emitPop, playerScreen, type ZoneId } from "./useGameStore";

/* ----- RNG ----- */
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ----- Types ----- */
interface Tree {
  x: number;
  size: number;
  shade: number;
  kind: "pine" | "round" | "birch";
  hue: number;
  wiggle: number; // 0 = still, >0 = amplitude in px
  phase: number;
}
interface Bush {
  x: number;
  size: number;
  hue: number;
  wiggle: number;
  phase: number;
}
interface Extra {
  kind: "tree" | "bush" | "grass" | "mushroom";
  x: number;
  size: number;
  hue: number;
  threshold: number; // 0..1 greenness required to reveal
  treeKind?: Tree["kind"];
  mushroomCap?: string;
}
interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  trees: Tree[];
  bushes: Bush[];
  extras: Extra[];
  isShrine?: boolean;
  rocky?: boolean;
  bumps?: { x: number; h: number }[];
}
interface Fish {
  x: number;
  y: number;
  vx: number;
  phase: number;
  size: number;
  kind: "oval" | "long" | "round";
  color: string;
}
interface Ripple {
  x: number;
  y: number;
  born: number;
  life: number;
}
interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}
interface Zone {
  id: ZoneId;
  x: number;
  y: number;
}
interface SignRect {
  id: Exclude<ZoneId, null>;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const WORLD_W = 4200;
const GROUND_Y = 520;
const WATER_Y = 620;
const GRAVITY = 1800;
const MOVE_ACCEL = 2400;
const MOVE_MAX = 280;
const FRICTION = 1800;
const JUMP_V = -640;
const PLAYER_R = 12;
const STEP_INTERVAL = 3; // seconds — reward tick cadence

/* ----- Level generation ----- */
function generateLevel(seed: number): { platforms: Platform[]; zones: Zone[] } {
  const rnd = mulberry32(seed);
  const platforms: Platform[] = [];

  platforms.push(makePlatform(80, GROUND_Y, 200, rnd));
  let x = platforms[0].x + platforms[0].w;
  let y = GROUND_Y;

  // Reachability budget: JUMP_V=-640, GRAVITY=1800 → apex ~113px, airtime ~0.71s,
  // horizontal reach ~200px at MOVE_MAX=280. Keep gaps/rises inside a safe margin.
  while (x < WORLD_W - 260) {
    const gap = 45 + rnd() * 85; // 45..130
    const rise = rnd() * 75; // up to 75 up
    const fall = rnd() * 110; // up to 110 down
    const dy = rnd() < 0.5 ? -rise : fall;
    y = Math.max(300, Math.min(560, y + dy));
    const w = 90 + rnd() * 100;
    platforms.push(makePlatform(x + gap, y, w, rnd));
    x = x + gap + w;
  }

  platforms.push(makePlatform(WORLD_W - 220, GROUND_Y - 20, 200, rnd));

  const centerX = WORLD_W / 2;
  const shrineIdx = platforms.reduce(
    (best, p, i) =>
      Math.abs(p.x + p.w / 2 - centerX) < Math.abs(platforms[best].x + platforms[best].w / 2 - centerX)
        ? i
        : best,
    0,
  );
  platforms[shrineIdx] = {
    ...platforms[shrineIdx],
    x: centerX - 90,
    w: 180,
    y: GROUND_Y - 10,
    trees: [],
    bushes: [],
    extras: [],
    isShrine: true,
  };

  const first = platforms[0];
  const last = platforms[platforms.length - 1];
  const shrine = platforms[shrineIdx];
  const zones: Zone[] = [
    { id: "voice", x: first.x + first.w / 2, y: first.y },
    { id: "checklist", x: last.x + last.w / 2, y: last.y },
    { id: "shrine", x: shrine.x + shrine.w / 2, y: shrine.y },
  ];
  return { platforms, zones };
}

function makePlatform(x: number, y: number, w: number, rnd: () => number): Platform {
  const treeCount = 1 + Math.floor(rnd() * 4); // 1..4
  const kinds: Tree["kind"][] = ["pine", "round", "birch"];
  const trees: Tree[] = Array.from({ length: treeCount }, () => ({
    x: 10 + rnd() * (w - 20),
    size: 20 + rnd() * 24,
    shade: rnd(),
    kind: kinds[Math.floor(rnd() * kinds.length)],
    hue: rnd(),
    wiggle: rnd() < 0.4 ? 1.2 + rnd() * 1.8 : 0,
    phase: rnd() * Math.PI * 2,
  }));
  const bushCount = Math.floor(rnd() * 3); // 0..2
  const bushes: Bush[] = Array.from({ length: bushCount }, () => ({
    x: 8 + rnd() * (w - 16),
    size: 6 + rnd() * 8,
    hue: rnd(),
    wiggle: rnd() < 0.5 ? 0.8 + rnd() * 1.4 : 0,
    phase: rnd() * Math.PI * 2,
  }));

  // Pre-generate a lush "greening" layer that reveals as the shrine tree matures.
  // Each entry has a threshold in 0..1; drawn only when greenness >= threshold.
  const extras: Extra[] = [];
  const grassCount = 8 + Math.floor(rnd() * 10);
  for (let i = 0; i < grassCount; i++) {
    extras.push({
      kind: "grass",
      x: 4 + rnd() * (w - 8),
      size: 3 + rnd() * 4,
      hue: rnd(),
      threshold: 0.05 + rnd() * 0.4,
    });
  }
  const extraBushCount = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < extraBushCount; i++) {
    extras.push({
      kind: "bush",
      x: 8 + rnd() * (w - 16),
      size: 6 + rnd() * 10,
      hue: rnd(),
      threshold: 0.2 + rnd() * 0.4,
    });
  }
  const mushroomCount = Math.floor(rnd() * 3);
  const caps = ["#c04a3a", "#d98a3a", "#8a6fb0", "#efe0a8"];
  for (let i = 0; i < mushroomCount; i++) {
    extras.push({
      kind: "mushroom",
      x: 10 + rnd() * (w - 20),
      size: 3 + rnd() * 3,
      hue: rnd(),
      threshold: 0.35 + rnd() * 0.35,
      mushroomCap: caps[Math.floor(rnd() * caps.length)],
    });
  }
  const extraTreeCount = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < extraTreeCount; i++) {
    extras.push({
      kind: "tree",
      x: 10 + rnd() * (w - 20),
      size: 18 + rnd() * 22,
      hue: rnd(),
      threshold: 0.55 + rnd() * 0.4,
      treeKind: kinds[Math.floor(rnd() * kinds.length)],
    });
  }

  const rocky = rnd() < 0.35;
  const bumps = rocky
    ? Array.from({ length: 3 + Math.floor(rnd() * 4) }, () => ({
        x: rnd() * w,
        h: 4 + rnd() * 9,
      }))
    : undefined;

  return { x, y, w, h: 220, trees, bushes, extras, rocky, bumps };
}

/* ----- Fishes ----- */
function makeFishes(rnd: () => number): Fish[] {
  const colors = ["#5e8794", "#6fa89b", "#8a9e6f", "#b58a5c", "#7891a8"];
  const kinds: Fish["kind"][] = ["oval", "long", "round"];
  return Array.from({ length: 18 }, () => {
    const depth = rnd();
    return {
      x: rnd() * WORLD_W,
      y: WATER_Y + 15 + depth * 100,
      vx: (rnd() > 0.5 ? 1 : -1) * (15 + rnd() * 40),
      phase: rnd() * Math.PI * 2,
      size: 3 + rnd() * 6,
      kind: kinds[Math.floor(rnd() * kinds.length)],
      color: colors[Math.floor(rnd() * colors.length)],
    };
  });
}

/* ----- Colors ----- */
const C = {
  skyTop: "#e6f0f5",
  skyBot: "#c9e0ea",
  sun: "#f7e28a",
  hillFar: "#b8c7b0",
  hillMid: "#a2b696",
  cloud: "rgba(255, 255, 255, 0.75)",
  platTop: "#e6d4a8",
  platFront: "#a37e51",
  platShade: "#8a663d",
  treeTrunk: "#7a5a3b",
  birchTrunk: "#e8e0d2",
  waterSurface: "#b9dee8",
  waterMid: "#7fb5c4",
  waterDeep: "#4d7f8f",
  waterFoam: "rgba(255,255,255,0.55)",
  player: "#c05a3a",
  playerDark: "#8a3b23",
  shrine: "#8a7460",
  tree: "#6da560",
};

const LEAF_PALETTES = [
  ["#a3cf94", "#7fb56b", "#5c9257"],
  ["#c9d38a", "#a8b76b", "#7f8f4a"],
  ["#8ab89f", "#5f9c7f", "#3f7a5f"],
  ["#d4b880", "#b3945a", "#8a6f3f"], // autumn hint
];
const BUSH_PALETTE = ["#7fb56b", "#6ea28a", "#a8b76b", "#8fa676"];

/* ----- Daylight schemes: morning, day, sunset. Chosen from levelSeed. ----- */
interface Scheme {
  name: "morning" | "day" | "sunset";
  skyTop: string;
  skyMid: string;
  skyBot: string;
  sunCoreA: string;
  sunCoreB: string;
  sunHaloA: string;
  sunHaloB: string;
  sunHaloC: string;
  tintR: number;
  tintG: number;
  tintB: number;
  tintAlpha: number;
  uiPrimary: string; // hsl triple for --primary
  uiAccent: string;
}
const PALETTES: Scheme[] = [
  {
    name: "morning",
    skyTop: "#fde3c8",
    skyMid: "#f6d9d0",
    skyBot: "#cfe5e6",
    sunCoreA: "#fff2d2",
    sunCoreB: "#ffb27a",
    sunHaloA: "rgba(255,220,190,0.85)",
    sunHaloB: "rgba(255,190,150,0.55)",
    sunHaloC: "rgba(255,170,120,0.22)",
    tintR: 255,
    tintG: 224,
    tintB: 200,
    tintAlpha: 0.16,
    uiPrimary: "24 78% 58%",
    uiAccent: "34 60% 88%",
  },
  {
    name: "day",
    skyTop: "#e6f0f5",
    skyMid: "#d8e8ee",
    skyBot: "#c9e0ea",
    sunCoreA: "#fff5c7",
    sunCoreB: "#f7c96a",
    sunHaloA: "rgba(255,250,210,0.85)",
    sunHaloB: "rgba(255,234,160,0.55)",
    sunHaloC: "rgba(247,210,130,0.22)",
    tintR: 255,
    tintG: 245,
    tintB: 225,
    tintAlpha: 0.12,
    uiPrimary: "190 45% 45%",
    uiAccent: "50 40% 88%",
  },
  {
    name: "sunset",
    skyTop: "#ff9d78",
    skyMid: "#e07a97",
    skyBot: "#8a6fb0",
    sunCoreA: "#ffd9a8",
    sunCoreB: "#ff6a4a",
    sunHaloA: "rgba(255,180,150,0.85)",
    sunHaloB: "rgba(255,130,110,0.55)",
    sunHaloC: "rgba(200,90,120,0.24)",
    tintR: 255,
    tintG: 190,
    tintB: 180,
    tintAlpha: 0.2,
    uiPrimary: "340 65% 58%",
    uiAccent: "20 55% 85%",
  },
];

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levelSeed = useGameStore((s) => s.levelSeed);
  const setActiveZone = useGameStore((s) => s.setActiveZone);
  const addSteps = useGameStore((s) => s.addSteps);
  const growTree = useGameStore((s) => s.growTree);
  const spendSeeds = useGameStore((s) => s.spendSeeds);
  const openZone = useGameStore((s) => s.openZone);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let running = true;

    const dpr = () => window.devicePixelRatio || 1;
    const resize = () => {
      const d = dpr();
      canvas.width = window.innerWidth * d;
      canvas.height = window.innerHeight * d;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const level = generateLevel(levelSeed);
    const fishes = makeFishes(mulberry32(levelSeed ^ 0x1234));
    const scheme = PALETTES[levelSeed % PALETTES.length];
    // Apply UI accent tint so the chrome shifts with the daylight scheme
    document.documentElement.style.setProperty("--primary", scheme.uiPrimary);
    document.documentElement.style.setProperty("--accent", scheme.uiAccent);
    const clouds = Array.from({ length: 10 }, (_, i) => {
      const r = mulberry32(levelSeed ^ (i * 999));
      return {
        x: r() * WORLD_W,
        y: 30 + r() * 160,
        w: 80 + r() * 140,
        h: 14 + r() * 14,
        vx: 8 + r() * 12,
      };
    });
    const ripples: Ripple[] = [];
    const motes: Mote[] = Array.from({ length: 40 }, () => {
      const r = Math.random;
      return {
        x: r() * window.innerWidth,
        y: r() * window.innerHeight,
        vx: (r() - 0.5) * 8,
        vy: -4 - r() * 6,
        size: 0.6 + r() * 1.6,
        alpha: 0.15 + r() * 0.35,
      };
    });

    const player = {
      x: level.zones[0].x + 40,
      y: level.zones[0].y - 40,
      vx: 0,
      vy: 0,
      grounded: false,
      coyote: 0,
      lastStepX: 0,
      distAccum: 0,
      stepTimer: 0,
      jumpsUsed: 0,
      dashCooldown: 0,
      lastLeftTap: -999,
      lastRightTap: -999,
    };
    player.lastStepX = player.x;

    let cam = { x: 0 };
    const sun = { x: 300, y: 100, intensity: 1, speedEase: 0 };

    let signRects: SignRect[] = [];

    const keys = new Set<string>();
    const justPressed = new Set<string>();
    const keyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const code = e.code || e.key;
      if (
        code === "ArrowLeft" ||
        code === "ArrowRight" ||
        code === "KeyA" ||
        code === "KeyD" ||
        code === "Space" ||
        code === "ArrowUp" ||
        code === "KeyW"
      ) {
        e.preventDefault();
      }
      if (!keys.has(code)) justPressed.add(code);
      keys.add(code);
    };
    const keyUp = (e: KeyboardEvent) => {
      keys.delete(e.code || e.key);
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      for (const s of signRects) {
        if (px >= s.x1 && px <= s.x2 && py >= s.y1 && py <= s.y2) {
          openZone(s.id);
          break;
        }
      }
    };
    canvas.addEventListener("pointerdown", onPointerDown);

    let last = performance.now();
    let shrineTime = 0;
    let tintPhase = 0;
    let rippleTimer = 0;

    const loop = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const W = canvas.width / dpr();
      const H = canvas.height / dpr();

      const left = keys.has("ArrowLeft") || keys.has("KeyA");
      const right = keys.has("ArrowRight") || keys.has("KeyD");
      const jump = keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW");

      if (left) player.vx -= MOVE_ACCEL * dt;
      if (right) player.vx += MOVE_ACCEL * dt;
      if (!left && !right) {
        const s = Math.sign(player.vx);
        player.vx -= s * Math.min(Math.abs(player.vx), FRICTION * dt);
      }
      player.vx = Math.max(-MOVE_MAX, Math.min(MOVE_MAX, player.vx));

      player.vy += GRAVITY * dt;

      if (jump && (player.grounded || player.coyote > 0)) {
        player.vy = JUMP_V;
        player.grounded = false;
        player.coyote = 0;
      }

      const prevY = player.y;
      const prevX = player.x;
      player.x += player.vx * dt;
      player.y += player.vy * dt;

      player.grounded = false;
      if (player.vy >= 0) {
        for (const p of level.platforms) {
          if (
            player.x + PLAYER_R > p.x &&
            player.x - PLAYER_R < p.x + p.w &&
            prevY + PLAYER_R <= p.y + 1 &&
            player.y + PLAYER_R >= p.y
          ) {
            player.y = p.y - PLAYER_R;
            player.vy = 0;
            player.grounded = true;
            break;
          }
        }
      }
      if (player.grounded) player.coyote = 0.08;
      else player.coyote = Math.max(0, player.coyote - dt);

      if (player.x < 10) {
        player.x = 10;
        player.vx = 0;
      }
      if (player.x > WORLD_W - 10) {
        player.x = WORLD_W - 10;
        player.vx = 0;
      }

      if (player.y > WATER_Y + 200) {
        const shrine = level.zones.find((z) => z.id === "shrine")!;
        player.x = shrine.x;
        player.y = shrine.y - 60;
        player.vx = 0;
        player.vy = 0;
        player.lastStepX = player.x;
        player.distAccum = 0;
        // splash ripple
        ripples.push({ x: shrine.x, y: WATER_Y, born: now, life: 900 });
      }

      // Reward: steps every STEP_INTERVAL seconds
      player.distAccum += Math.abs(player.x - prevX);
      player.stepTimer += dt;
      if (player.stepTimer >= STEP_INTERVAL) {
        player.stepTimer = 0;
        const n = Math.floor(player.distAccum / 40);
        player.distAccum -= n * 40;
        if (n > 0) {
          addSteps(n);
          emitPop(`+${n}`, playerScreen.x, playerScreen.y - 20, "#c05a3a");
        }
      }

      const targetCam = Math.max(0, Math.min(WORLD_W - W, player.x - W / 2));
      cam.x += (targetCam - cam.x) * Math.min(1, dt * 6);

      // Sun follows player w/ delay; Y responds to player speed (dips when moving).
      const speedNorm = Math.min(1, Math.abs(player.vx) / MOVE_MAX);
      sun.speedEase += (speedNorm - sun.speedEase) * Math.min(1, dt * 2.5);
      const sunTargetX = player.x - 120;
      const baseY = 70 + Math.sin(now / 3200) * 12;
      const sunTargetY = baseY + sun.speedEase * 22;
      sun.x += (sunTargetX - sun.x) * dt * 0.35;
      sun.y += (sunTargetY - sun.y) * dt * 1.2;
      tintPhase += dt * 0.05;
      sun.intensity = 0.75 + Math.sin(tintPhase) * 0.25;

      let active: ZoneId = null;
      let bestD = 220;
      for (const z of level.zones) {
        const d = Math.abs(player.x - z.x);
        if (d < bestD) {
          bestD = d;
          active = z.id;
        }
      }
      setActiveZone(active);

      if (active === "shrine" && player.grounded) {
        shrineTime += dt;
        if (shrineTime > 0.5) {
          shrineTime = 0;
          const seeds = useGameStore.getState().seeds;
          if (seeds >= 5) {
            spendSeeds(5);
            growTree(1);
            emitPop("+1 🌱", playerScreen.x, playerScreen.y - 40, "#4d8f5a");
          }
        }
      } else {
        shrineTime = 0;
      }

      playerScreen.x = player.x - cam.x;
      playerScreen.y = player.y;

      // Occasional random water ripples
      rippleTimer -= dt;
      if (rippleTimer <= 0) {
        rippleTimer = 0.4 + Math.random() * 1.1;
        ripples.push({
          x: cam.x + Math.random() * W,
          y: WATER_Y + 6 + Math.random() * 40,
          born: now,
          life: 1400,
        });
      }

      // ---- Render ----
      // Sky gradient
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, C.skyTop);
      g.addColorStop(0.6, "#d8e8ee");
      g.addColorStop(1, C.skyBot);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // Sun — multi-stop radial shader + soft god-ray halo
      const sunScreenX = sun.x - cam.x * 0.1;
      const sunScreenY = sun.y;
      const halo = ctx.createRadialGradient(
        sunScreenX,
        sunScreenY,
        4,
        sunScreenX,
        sunScreenY,
        320,
      );
      halo.addColorStop(0, `rgba(255, 250, 210, ${0.85 * sun.intensity})`);
      halo.addColorStop(0.15, `rgba(255, 234, 160, ${0.55 * sun.intensity})`);
      halo.addColorStop(0.4, `rgba(247, 210, 130, ${0.22 * sun.intensity})`);
      halo.addColorStop(0.75, `rgba(247, 200, 120, ${0.08 * sun.intensity})`);
      halo.addColorStop(1, "rgba(247, 200, 120, 0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, W, H);
      // Sun core diamond
      ctx.save();
      ctx.translate(sunScreenX, sunScreenY);
      ctx.rotate(Math.PI / 4);
      const core = ctx.createLinearGradient(-20, -20, 20, 20);
      core.addColorStop(0, "#fff5c7");
      core.addColorStop(1, "#f7c96a");
      ctx.fillStyle = core;
      const s = 22 + sun.intensity * 4;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();

      // Parallax clouds
      ctx.fillStyle = C.cloud;
      for (const c of clouds) {
        const sx = c.x - cam.x * 0.15;
        const wrap = ((sx % (WORLD_W + 200)) + WORLD_W + 200) % (WORLD_W + 200);
        drawCloud(ctx, wrap - 200, c.y, c.w, c.h);
      }

      // Distant hills
      ctx.fillStyle = C.hillFar;
      drawHills(ctx, W, H, cam.x * 0.25, 60, GROUND_Y - 40);
      ctx.fillStyle = C.hillMid;
      drawHills(ctx, W, H, cam.x * 0.45, 40, GROUND_Y);

      // ----- Water with depth bands -----
      const waterGrad = ctx.createLinearGradient(0, WATER_Y, 0, H);
      waterGrad.addColorStop(0, C.waterSurface);
      waterGrad.addColorStop(0.35, C.waterMid);
      waterGrad.addColorStop(1, C.waterDeep);
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, WATER_Y, W, H - WATER_Y);
      // Depth streaks
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        const y = WATER_Y + (H - WATER_Y) * (i / 5);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      // Surface waves — two layered lines
      ctx.strokeStyle = C.waterFoam;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let sx = 0; sx <= W; sx += 6) {
        const wy = WATER_Y + Math.sin((sx + now / 8) * 0.03) * 3;
        if (sx === 0) ctx.moveTo(sx, wy);
        else ctx.lineTo(sx, wy);
      }
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let sx = 0; sx <= W; sx += 6) {
        const wy = WATER_Y + 6 + Math.sin((sx + now / 6 + 40) * 0.045) * 2;
        if (sx === 0) ctx.moveTo(sx, wy);
        else ctx.lineTo(sx, wy);
      }
      ctx.stroke();

      // Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        const age = now - r.born;
        if (age > r.life) {
          ripples.splice(i, 1);
          continue;
        }
        const t = age / r.life;
        const rx = r.x - cam.x;
        if (rx < -60 || rx > W + 60) continue;
        ctx.strokeStyle = `rgba(255,255,255,${(1 - t) * 0.5})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(rx, r.y, 4 + t * 26, 1 + t * 5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Fishes
      for (const f of fishes) {
        f.x += f.vx * dt;
        if (f.x < 0 || f.x > WORLD_W) f.vx *= -1;
        f.phase += dt * 2;
        const fx = f.x - cam.x;
        const fy = f.y + Math.sin(f.phase) * 4;
        if (fx < -20 || fx > W + 20) continue;
        drawFish(ctx, fx, fy, f);
      }

      // Greenness: 0 until the shrine tree matures, then grows toward 1.
      // Shrine tree fully evolves around growth ~70; world greening runs from 70..270.
      const growthNow = useGameStore.getState().treeGrowth;
      const greenness = Math.max(0, Math.min(1, (growthNow - 70) / 200));

      // Platforms + foliage
      for (const p of level.platforms) {
        const px = p.x - cam.x;
        if (px + p.w < -40 || px > W + 40) continue;
        // Front face w/ subtle gradient — lerps toward mossy earth as world greens
        const front = lerpColor(C.platFront, "#6b7a3d", greenness * 0.55);
        const shade = lerpColor(C.platShade, "#4a5a28", greenness * 0.6);
        const pf = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
        pf.addColorStop(0, front);
        pf.addColorStop(1, shade);
        ctx.fillStyle = pf;
        ctx.fillRect(px, p.y, p.w, p.h);
        // Top face — sandy → mossy green
        ctx.fillStyle = lerpColor(C.platTop, "#7fb56b", greenness);
        ctx.fillRect(px, p.y, p.w, 8);
        // Moss overhang once greenness > 0.3
        if (greenness > 0.3) {
          ctx.fillStyle = `rgba(90, 140, 70, ${(greenness - 0.3) * 0.9})`;
          for (let mx = 0; mx < p.w; mx += 6) {
            const drop = 2 + Math.sin(mx * 0.7) * 2;
            ctx.fillRect(px + mx, p.y + 8, 4, drop);
          }
        }
        // Original bushes + trees
        for (const b of p.bushes) {
          drawBush(ctx, px + b.x, p.y, b.size, b.hue);
        }
        for (const t of p.trees) {
          drawTree(ctx, px + t.x, p.y, t);
        }
        // Extras revealed by greenness (skip shrine platform)
        if (!p.isShrine) {
          for (const ex of p.extras) {
            if (greenness < ex.threshold) continue;
            const fade = Math.min(1, (greenness - ex.threshold) / 0.15);
            ctx.save();
            ctx.globalAlpha = fade;
            const exx = px + ex.x;
            if (ex.kind === "grass") drawGrass(ctx, exx, p.y, ex.size, ex.hue);
            else if (ex.kind === "bush") drawBush(ctx, exx, p.y, ex.size, ex.hue);
            else if (ex.kind === "mushroom")
              drawMushroom(ctx, exx, p.y, ex.size, ex.mushroomCap!);
            else if (ex.kind === "tree")
              drawTree(ctx, exx, p.y, {
                x: 0,
                size: ex.size,
                shade: ex.hue,
                kind: ex.treeKind!,
                hue: ex.hue,
                wiggle: 0,
                phase: 0,
              }, 0);
            ctx.restore();
          }
        }
      }

      // Shrine — evolving tree with branches
      const shrine = level.zones.find((z) => z.id === "shrine")!;
      drawShrineTree(ctx, shrine.x - cam.x, shrine.y, growthNow);

      // Signposts + capture screen rects for click hit-testing
      signRects = [];
      for (const z of level.zones) {
        if (z.id === "shrine") continue;
        const sx = z.x - cam.x;
        drawSignpost(ctx, sx, z.y, z.id === "voice" ? "VOICE" : "LIST", active === z.id);
        signRects.push({
          id: z.id!,
          x1: sx - 26,
          y1: z.y - 46,
          x2: sx + 26,
          y2: z.y - 24,
        });
      }

      // Player
      const psx = player.x - cam.x;
      const psy = player.y;
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.beginPath();
      ctx.ellipse(psx, psy + PLAYER_R + 2, PLAYER_R, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.player;
      ctx.beginPath();
      ctx.arc(psx, psy, PLAYER_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.playerDark;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      const eyeDir = player.vx > 5 ? 3 : player.vx < -5 ? -3 : 0;
      ctx.beginPath();
      ctx.arc(psx + eyeDir, psy - 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(psx + eyeDir + 1, psy - 3, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Foreground water ripple layer
      ctx.strokeStyle = "rgba(127,181,196,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const fgOffset = cam.x * 1.2;
      for (let sx = 0; sx <= W; sx += 10) {
        const wy = H - 30 + Math.sin((sx + fgOffset + now / 5) * 0.04) * 6;
        if (sx === 0) ctx.moveTo(sx, wy);
        else ctx.lineTo(sx, wy);
      }
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fillStyle = "rgba(168, 212, 224, 0.6)";
      ctx.fill();

      // ----- Particle motes (drifting dust/pollen) -----
      for (const m of motes) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.y < -10) {
          m.y = H + 10;
          m.x = Math.random() * W;
        }
        if (m.x < -10) m.x = W + 10;
        if (m.x > W + 10) m.x = -10;
        ctx.fillStyle = `rgba(255, 245, 210, ${m.alpha})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // ----- Foreground light shader: warm/cool tint from sun intensity -----
      ctx.globalCompositeOperation = "multiply";
      const tintR = 255;
      const tintG = 240 + (sun.intensity - 0.75) * 40;
      const tintB = 220 + (sun.intensity - 0.75) * -60;
      ctx.fillStyle = `rgba(${tintR | 0},${tintG | 0},${tintB | 0},0.14)`;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";

      // Subtle radial light beam from sun position (screen)
      const beam = ctx.createRadialGradient(sunScreenX, sunScreenY, 40, sunScreenX, sunScreenY, Math.max(W, H));
      beam.addColorStop(0, `rgba(255, 240, 200, ${0.12 * sun.intensity})`);
      beam.addColorStop(1, "rgba(255, 240, 200, 0)");
      ctx.fillStyle = beam;
      ctx.fillRect(0, 0, W, H);

      // Vignette for depth
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(20, 30, 40, 0.35)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
    };
  }, [levelSeed, setActiveZone, addSteps, growTree, spendSeeds, openZone]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 h-screen w-screen"
      aria-label="Interactive platformer world"
    />
  );
}

/* ---- Draw helpers ---- */
function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillRect(x, y, w, h);
  ctx.fillRect(x + w * 0.2, y - h * 0.6, w * 0.5, h * 0.7);
  ctx.fillRect(x + w * 0.5, y - h * 0.3, w * 0.3, h * 0.5);
}
function drawHills(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  offset: number,
  amp: number,
  baseY: number,
) {
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 30) {
    const y = baseY - Math.sin((x + offset) * 0.005) * amp - amp / 2;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}
function drawTree(ctx: CanvasRenderingContext2D, x: number, groundY: number, t: Tree) {
  const palette = LEAF_PALETTES[Math.floor(t.hue * LEAF_PALETTES.length) % LEAF_PALETTES.length];
  const trunkH = t.size * 1.2;
  if (t.kind === "birch") {
    ctx.fillStyle = C.birchTrunk;
    ctx.fillRect(x - 2, groundY - trunkH, 4, trunkH);
    ctx.fillStyle = "#2a2a2a";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x - 2, groundY - trunkH + 6 + i * (trunkH / 3), 4, 1);
    }
  } else {
    ctx.fillStyle = C.treeTrunk;
    ctx.fillRect(x - 3, groundY - trunkH, 6, trunkH);
  }

  if (t.kind === "pine") {
    // stacked triangles
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = palette[i] ?? palette[palette.length - 1];
      const ly = groundY - trunkH + (i * t.size) / 3;
      const lw = t.size - i * (t.size / 5);
      ctx.beginPath();
      ctx.moveTo(x, ly - t.size * 0.55);
      ctx.lineTo(x - lw / 2, ly);
      ctx.lineTo(x + lw / 2, ly);
      ctx.closePath();
      ctx.fill();
    }
  } else if (t.kind === "round") {
    // canopy as overlapping circles
    ctx.fillStyle = palette[1];
    ctx.beginPath();
    ctx.arc(x, groundY - trunkH, t.size * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette[2];
    ctx.beginPath();
    ctx.arc(x - t.size * 0.35, groundY - trunkH + t.size * 0.15, t.size * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette[0];
    ctx.beginPath();
    ctx.arc(x + t.size * 0.3, groundY - trunkH - t.size * 0.1, t.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // birch: cloud-like small canopy
    ctx.fillStyle = palette[0];
    ctx.beginPath();
    ctx.arc(x, groundY - trunkH, t.size * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette[2];
    ctx.beginPath();
    ctx.arc(x + t.size * 0.25, groundY - trunkH - t.size * 0.15, t.size * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawBush(ctx: CanvasRenderingContext2D, x: number, groundY: number, size: number, hue: number) {
  const color = BUSH_PALETTE[Math.floor(hue * BUSH_PALETTE.length) % BUSH_PALETTE.length];
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x - size * 0.6, groundY - size * 0.4, size * 0.7, 0, Math.PI * 2);
  ctx.arc(x, groundY - size * 0.7, size, 0, Math.PI * 2);
  ctx.arc(x + size * 0.6, groundY - size * 0.4, size * 0.7, 0, Math.PI * 2);
  ctx.fill();
}
function drawFish(ctx: CanvasRenderingContext2D, x: number, y: number, f: Fish) {
  const dir = f.vx > 0 ? 1 : -1;
  ctx.fillStyle = f.color;
  if (f.kind === "long") {
    ctx.beginPath();
    ctx.ellipse(x, y, f.size * 1.6, f.size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (f.kind === "round") {
    ctx.beginPath();
    ctx.arc(x, y, f.size * 0.9, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(x, y, f.size, f.size * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Tail
  ctx.beginPath();
  ctx.moveTo(x - dir * f.size, y);
  ctx.lineTo(x - dir * (f.size + 5), y - 3);
  ctx.lineTo(x - dir * (f.size + 5), y + 3);
  ctx.closePath();
  ctx.fill();
  // Eye
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(x + dir * f.size * 0.5, y - f.size * 0.15, Math.max(0.6, f.size * 0.18), 0, Math.PI * 2);
  ctx.fill();
}
/* ---- Color lerp ---- */
function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerpColor(a: string, b: string, t: number) {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

/* ---- Grass & mushroom ---- */
function drawGrass(ctx: CanvasRenderingContext2D, x: number, groundY: number, size: number, hue: number) {
  const shades = ["#7fb56b", "#5c9257", "#a3cf94"];
  ctx.strokeStyle = shades[Math.floor(hue * shades.length) % shades.length];
  ctx.lineWidth = 1;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 1.5, groundY);
    ctx.quadraticCurveTo(x + i * 1.5 + i, groundY - size / 2, x + i * 2, groundY - size);
    ctx.stroke();
  }
}
function drawMushroom(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  size: number,
  cap: string,
) {
  // stem
  ctx.fillStyle = "#f2ead9";
  ctx.fillRect(x - size * 0.25, groundY - size * 1.1, size * 0.5, size * 1.1);
  // cap
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.ellipse(x, groundY - size * 1.1, size, size * 0.7, 0, Math.PI, 0);
  ctx.fill();
  // dots
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(x - size * 0.35, groundY - size * 1.25, size * 0.12, 0, Math.PI * 2);
  ctx.arc(x + size * 0.25, groundY - size * 1.35, size * 0.14, 0, Math.PI * 2);
  ctx.arc(x + size * 0.05, groundY - size * 1.15, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

/* ---- Shrine tree with branches, 5 evolutionary stages ---- */
function shrineStage(growth: number) {
  if (growth < 8) return 0;
  if (growth < 20) return 1;
  if (growth < 40) return 2;
  if (growth < 70) return 3;
  return 4;
}
function drawShrineTree(ctx: CanvasRenderingContext2D, x: number, groundY: number, growth: number) {
  // Stone altar
  ctx.fillStyle = C.shrine;
  ctx.fillRect(x - 22, groundY - 10, 44, 10);
  ctx.fillStyle = "#a89a8a";
  ctx.fillRect(x - 22, groundY - 14, 44, 4);

  const stage = shrineStage(growth);
  const base = groundY - 14;
  // extra tuning within a stage: gentle scale continues to nudge upward
  const nudge = Math.min(1, (growth - [0, 8, 20, 40, 70][stage]) / 40);
  const leaf1 = "#7fb56b";
  const leaf2 = "#4d8f5a";
  const leaf3 = "#a3cf94";

  if (stage === 0) {
    // sprout: two tiny leaves
    ctx.strokeStyle = "#5c9257";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.lineTo(x, base - 8);
    ctx.stroke();
    ctx.fillStyle = leaf1;
    ctx.beginPath();
    ctx.ellipse(x - 3, base - 8, 3, 2, -0.6, 0, Math.PI * 2);
    ctx.ellipse(x + 3, base - 8, 3, 2, 0.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (stage === 1) {
    // sapling: thin trunk + small canopy
    const h = 14 + nudge * 8;
    ctx.strokeStyle = C.treeTrunk;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.lineTo(x, base - h);
    ctx.stroke();
    ctx.fillStyle = leaf1;
    ctx.beginPath();
    ctx.arc(x, base - h, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = leaf2;
    ctx.beginPath();
    ctx.arc(x - 3, base - h - 2, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (stage === 2) {
    // young: trunk + 2 branches + canopy
    const h = 26 + nudge * 10;
    drawBranch(ctx, x, base, -Math.PI / 2, h, 4, 2, leaf1, leaf2, leaf3);
  } else if (stage === 3) {
    // mature: fuller branching
    const h = 42 + nudge * 12;
    drawBranch(ctx, x, base, -Math.PI / 2, h, 6, 3, leaf1, leaf2, leaf3);
  } else {
    // ancient: huge lush canopy
    const h = 58 + nudge * 14;
    drawBranch(ctx, x, base, -Math.PI / 2, h, 8, 4, leaf1, leaf2, leaf3);
    // extra ambient leaves
    ctx.fillStyle = "rgba(163, 207, 148, 0.45)";
    ctx.beginPath();
    ctx.arc(x, base - h - 6, 42, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = "900 10px 'Archivo Black', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#4a4a4a";
  ctx.fillText("SHRINE", x, groundY + 20);
}

function drawBranch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  width: number,
  depth: number,
  leaf1: string,
  leaf2: string,
  leaf3: string,
) {
  const ex = x + Math.cos(angle) * length;
  const ey = y + Math.sin(angle) * length;
  ctx.strokeStyle = C.treeTrunk;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  if (depth <= 0) {
    // leaf cluster
    ctx.fillStyle = leaf2;
    ctx.beginPath();
    ctx.arc(ex, ey, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = leaf1;
    ctx.beginPath();
    ctx.arc(ex - 4, ey - 3, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = leaf3;
    ctx.beginPath();
    ctx.arc(ex + 3, ey - 5, 6, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // Two child branches; slight determinism via angle sign
  const spread = 0.55 + depth * 0.05;
  const nextLen = length * 0.72;
  const nextW = Math.max(1, width * 0.7);
  drawBranch(ctx, ex, ey, angle - spread, nextLen, nextW, depth - 1, leaf1, leaf2, leaf3);
  drawBranch(ctx, ex, ey, angle + spread, nextLen, nextW, depth - 1, leaf1, leaf2, leaf3);
  // occasional third smaller branch for lushness at higher depths
  if (depth >= 3) {
    drawBranch(ctx, ex, ey, angle - spread * 0.2, nextLen * 0.85, nextW * 0.9, depth - 1, leaf1, leaf2, leaf3);
  }
}
function drawSignpost(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  label: string,
  active: boolean,
) {
  ctx.fillStyle = "#6a4a2b";
  ctx.fillRect(x - 2, groundY - 40, 4, 40);
  ctx.fillStyle = active ? C.player : "#e6d4a8";
  ctx.fillRect(x - 24, groundY - 44, 48, 18);
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 24, groundY - 44, 48, 18);
  ctx.font = "900 10px 'Archivo Black', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = active ? "#fff" : "#1a1a1a";
  ctx.fillText(label, x, groundY - 32);
  if (active) {
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "900 9px 'Archivo Black', system-ui, sans-serif";
    ctx.fillText("▼", x, groundY - 50);
  }
}
