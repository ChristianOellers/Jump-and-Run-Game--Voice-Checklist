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
interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  trees: { x: number; size: number; shade: number }[];
}
interface Fish {
  x: number;
  y: number;
  vx: number;
  phase: number;
  size: number;
}
interface Zone {
  id: ZoneId;
  x: number;
  y: number;
}

const WORLD_W = 4200;
const GROUND_Y = 520; // baseline for platform y (world coords)
const WATER_Y = 620;
const GRAVITY = 1800;
const MOVE_ACCEL = 2400;
const MOVE_MAX = 280;
const FRICTION = 1800;
const JUMP_V = -640;
const PLAYER_R = 12;

/* ----- Level generation ----- */
function generateLevel(seed: number): { platforms: Platform[]; zones: Zone[] } {
  const rnd = mulberry32(seed);
  const platforms: Platform[] = [];

  // First platform (voice zone)
  platforms.push(makePlatform(80, GROUND_Y, 200, rnd));
  let x = platforms[0].x + platforms[0].w;
  let y = GROUND_Y;

  while (x < WORLD_W - 260) {
    const gap = 70 + rnd() * 90; // 70..160 (max jump reach ~200)
    const dy = (rnd() - 0.5) * 140; // ±70
    y = Math.max(300, Math.min(560, y + dy));
    const w = 90 + rnd() * 100;
    platforms.push(makePlatform(x + gap, y, w, rnd));
    x = x + gap + w;
  }

  // Last platform (checklist zone)
  platforms.push(makePlatform(WORLD_W - 220, GROUND_Y - 20, 200, rnd));

  // Shrine platform — inject at world center, replace nearest
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
    trees: [], // shrine has no decorative trees
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
  const treeCount = Math.floor(rnd() * 3);
  const trees = Array.from({ length: treeCount }, () => ({
    x: 10 + rnd() * (w - 20),
    size: 22 + rnd() * 18,
    shade: rnd(),
  }));
  return { x, y, w, h: 220, trees };
}

/* ----- Fishes ----- */
function makeFishes(rnd: () => number): Fish[] {
  return Array.from({ length: 12 }, () => ({
    x: rnd() * WORLD_W,
    y: WATER_Y + 20 + rnd() * 60,
    vx: (rnd() > 0.5 ? 1 : -1) * (20 + rnd() * 30),
    phase: rnd() * Math.PI * 2,
    size: 4 + rnd() * 4,
  }));
}

/* ----- Colors (pastel-natural) ----- */
const C = {
  skyTop: "#e6f0f5",
  skyBot: "#c9e0ea",
  sun: "#f7e28a",
  sunGlow: "rgba(247, 226, 138, 0.35)",
  hillFar: "#b8c7b0",
  hillMid: "#a2b696",
  cloud: "rgba(255, 255, 255, 0.75)",
  platTop: "#e6d4a8",
  platFront: "#a37e51",
  platShade: "#8a663d",
  treeTrunk: "#7a5a3b",
  treeLeafA: "#8fbf7a",
  treeLeafB: "#6da560",
  treeLeafC: "#4d8f5a",
  water: "#a8d4e0",
  waterDeep: "#7fb5c4",
  waterFoam: "rgba(255,255,255,0.5)",
  fish: "#5e8794",
  player: "#c05a3a",
  playerDark: "#8a3b23",
  shrine: "#8a7460",
  tree: "#6da560",
};

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levelSeed = useGameStore((s) => s.levelSeed);
  const setActiveZone = useGameStore((s) => s.setActiveZone);
  const addSteps = useGameStore((s) => s.addSteps);
  const growTree = useGameStore((s) => s.growTree);
  const spendSeeds = useGameStore((s) => s.spendSeeds);

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
    const clouds = Array.from({ length: 8 }, (_, i) => {
      const r = mulberry32(levelSeed ^ (i * 999));
      return { x: r() * WORLD_W, y: 40 + r() * 140, w: 80 + r() * 120, h: 16 + r() * 12 };
    });

    // Player
    const player = {
      x: level.zones[0].x + 40,
      y: level.zones[0].y - 40,
      vx: 0,
      vy: 0,
      grounded: false,
      coyote: 0,
      lastStepX: 0,
    };
    player.lastStepX = player.x;

    // Camera
    let cam = { x: 0 };
    const sun = { x: 300, y: 100, intensity: 1 };

    // Input
    const keys = new Set<string>();
    const keyDown = (e: KeyboardEvent) => {
      // Ignore when user is typing in a popover input
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
      keys.add(code);
    };
    const keyUp = (e: KeyboardEvent) => {
      keys.delete(e.code || e.key);
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    let last = performance.now();
    let shrineTime = 0;
    let tintPhase = 0;

    const loop = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const W = canvas.width / dpr();
      const H = canvas.height / dpr();

      // ---- Input → physics ----
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
      player.x += player.vx * dt;
      player.y += player.vy * dt;

      // Platform collision — top surface only, when moving downward
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

      // World bounds
      if (player.x < 10) {
        player.x = 10;
        player.vx = 0;
      }
      if (player.x > WORLD_W - 10) {
        player.x = WORLD_W - 10;
        player.vx = 0;
      }

      // Fall reset
      if (player.y > WATER_Y + 200) {
        const shrine = level.zones.find((z) => z.id === "shrine")!;
        player.x = shrine.x;
        player.y = shrine.y - 60;
        player.vx = 0;
        player.vy = 0;
        player.lastStepX = player.x;
      }

      // Reward: steps
      const dx = Math.abs(player.x - player.lastStepX);
      if (dx > 40) {
        const n = Math.floor(dx / 40);
        player.lastStepX = player.x;
        addSteps(n);
        emitPop(`+${n}`, playerScreen.x, playerScreen.y - 20, "#c05a3a");
      }

      // Camera follow
      const targetCam = Math.max(0, Math.min(WORLD_W - W, player.x - W / 2));
      cam.x += (targetCam - cam.x) * Math.min(1, dt * 6);

      // Sun follows player with delay
      const sunTargetX = player.x - 100;
      const sunTargetY = 60 + Math.sin(now / 3000) * 20;
      sun.x += (sunTargetX - sun.x) * dt * 0.3;
      sun.y += (sunTargetY - sun.y) * dt * 0.5;
      tintPhase += dt * 0.05;
      sun.intensity = 0.75 + Math.sin(tintPhase) * 0.25;

      // Active zone detection
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

      // Shrine growth: while standing on shrine convert seeds
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

      // Update playerScreen for HUD emitters
      playerScreen.x = player.x - cam.x;
      playerScreen.y = player.y;

      // ---- Render ----
      // Sky gradient
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, C.skyTop);
      g.addColorStop(1, C.skyBot);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // Sun glow (offscreen-cheap: radial gradient each frame)
      const sunScreenX = sun.x - cam.x * 0.1;
      const sunScreenY = sun.y;
      const glow = ctx.createRadialGradient(sunScreenX, sunScreenY, 10, sunScreenX, sunScreenY, 240);
      glow.addColorStop(0, `rgba(255, 240, 170, ${0.6 * sun.intensity})`);
      glow.addColorStop(0.4, `rgba(247, 226, 138, ${0.3 * sun.intensity})`);
      glow.addColorStop(1, "rgba(247, 226, 138, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      // Sun diamond
      ctx.save();
      ctx.translate(sunScreenX, sunScreenY);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = C.sun;
      const s = 22 + sun.intensity * 4;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();

      // Parallax clouds (layer 1)
      ctx.fillStyle = C.cloud;
      for (const c of clouds) {
        const sx = c.x - cam.x * 0.15;
        const wrap = ((sx % (WORLD_W + 200)) + WORLD_W + 200) % (WORLD_W + 200);
        drawCloud(ctx, wrap - 200, c.y, c.w, c.h);
      }

      // Distant hills (layer 1.5)
      ctx.fillStyle = C.hillFar;
      drawHills(ctx, W, H, cam.x * 0.25, 60, GROUND_Y - 40);
      ctx.fillStyle = C.hillMid;
      drawHills(ctx, W, H, cam.x * 0.45, 40, GROUND_Y);

      // Water (background layer, behind platforms)
      const waterScreenY = WATER_Y;
      ctx.fillStyle = C.water;
      ctx.fillRect(0, waterScreenY, W, H - waterScreenY);
      // wave line
      ctx.strokeStyle = C.waterFoam;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let sx = 0; sx <= W; sx += 8) {
        const wy = waterScreenY + Math.sin((sx + now / 8) * 0.03) * 3;
        if (sx === 0) ctx.moveTo(sx, wy);
        else ctx.lineTo(sx, wy);
      }
      ctx.stroke();

      // Fishes (in water, in world coords)
      for (const f of fishes) {
        f.x += f.vx * dt;
        if (f.x < 0 || f.x > WORLD_W) f.vx *= -1;
        f.phase += dt * 2;
        const fx = f.x - cam.x;
        const fy = f.y + Math.sin(f.phase) * 4;
        if (fx < -20 || fx > W + 20) continue;
        ctx.fillStyle = C.fish;
        ctx.beginPath();
        ctx.ellipse(fx, fy, f.size, f.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        const tailDir = f.vx > 0 ? -1 : 1;
        ctx.moveTo(fx + tailDir * f.size, fy);
        ctx.lineTo(fx + tailDir * (f.size + 5), fy - 3);
        ctx.lineTo(fx + tailDir * (f.size + 5), fy + 3);
        ctx.closePath();
        ctx.fill();
      }

      // Platforms
      for (const p of level.platforms) {
        const px = p.x - cam.x;
        if (px + p.w < -20 || px > W + 20) continue;
        // Front face
        ctx.fillStyle = C.platFront;
        ctx.fillRect(px, p.y, p.w, p.h);
        // Top face
        ctx.fillStyle = C.platTop;
        ctx.fillRect(px, p.y, p.w, 8);
        // Trees (decorative, no hitbox)
        for (const t of p.trees) {
          drawTree(ctx, px + t.x, p.y, t.size, t.shade);
        }
      }

      // Shrine marker on center platform
      const shrine = level.zones.find((z) => z.id === "shrine")!;
      drawShrine(ctx, shrine.x - cam.x, shrine.y, useGameStore.getState().treeGrowth);

      // Zone signposts
      for (const z of level.zones) {
        if (z.id === "shrine") continue;
        drawSignpost(
          ctx,
          z.x - cam.x,
          z.y,
          z.id === "voice" ? "VOICE" : "LIST",
          active === z.id,
        );
      }

      // Player
      const psx = player.x - cam.x;
      const psy = player.y;
      // shadow
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.beginPath();
      ctx.ellipse(psx, psy + PLAYER_R + 2, PLAYER_R, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // body
      ctx.fillStyle = C.player;
      ctx.beginPath();
      ctx.arc(psx, psy, PLAYER_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.playerDark;
      ctx.lineWidth = 2;
      ctx.stroke();
      // eye
      ctx.fillStyle = "#fff";
      const eyeDir = player.vx > 5 ? 3 : player.vx < -5 ? -3 : 0;
      ctx.beginPath();
      ctx.arc(psx + eyeDir, psy - 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(psx + eyeDir + 1, psy - 3, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Foreground water ripple (parallax layer 4)
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

      // Global warm/cool tint from sun intensity
      ctx.globalCompositeOperation = "multiply";
      const tintR = 255;
      const tintG = 240 + (sun.intensity - 0.75) * 40;
      const tintB = 220 + (sun.intensity - 0.75) * -60;
      ctx.fillStyle = `rgba(${tintR|0},${tintG|0},${tintB|0},0.12)`;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
    };
  }, [levelSeed, setActiveZone, addSteps, growTree, spendSeeds]);

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
  // Blocky pixel cloud
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
function drawTree(ctx: CanvasRenderingContext2D, x: number, groundY: number, size: number, shade: number) {
  // Trunk
  ctx.fillStyle = C.treeTrunk;
  const trunkH = size * 1.2;
  ctx.fillRect(x - 3, groundY - trunkH, 6, trunkH);
  // Stacked triangles
  const leaf = shade < 0.33 ? C.treeLeafA : shade < 0.66 ? C.treeLeafB : C.treeLeafC;
  ctx.fillStyle = leaf;
  const layers = 3;
  for (let i = 0; i < layers; i++) {
    const ly = groundY - trunkH + (i * size) / 3;
    const lw = size - i * (size / (layers * 1.6));
    ctx.beginPath();
    ctx.moveTo(x, ly - size * 0.5);
    ctx.lineTo(x - lw / 2, ly);
    ctx.lineTo(x + lw / 2, ly);
    ctx.closePath();
    ctx.fill();
  }
}
function drawShrine(ctx: CanvasRenderingContext2D, x: number, groundY: number, growth: number) {
  // Stone base
  ctx.fillStyle = C.shrine;
  ctx.fillRect(x - 22, groundY - 10, 44, 10);
  ctx.fillStyle = "#a89a8a";
  ctx.fillRect(x - 22, groundY - 14, 44, 4);
  // Growing tree
  const trunkH = 10 + Math.min(60, growth * 1.5);
  ctx.fillStyle = C.treeTrunk;
  ctx.fillRect(x - 3, groundY - 14 - trunkH, 6, trunkH);
  const canopy = 8 + Math.min(50, growth * 1.2);
  ctx.fillStyle = C.tree;
  ctx.beginPath();
  ctx.arc(x, groundY - 14 - trunkH, canopy, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.treeLeafC;
  ctx.beginPath();
  ctx.arc(x - canopy / 3, groundY - 14 - trunkH - canopy / 4, canopy * 0.6, 0, Math.PI * 2);
  ctx.fill();
  // Label
  ctx.font = "900 10px 'Archivo Black', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#4a4a4a";
  ctx.fillText("SHRINE", x, groundY + 20);
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
