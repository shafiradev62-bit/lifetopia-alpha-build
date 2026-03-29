/**
 * DemoScript.ts
 * Deterministic autopilot demo — no AI, no pathfinding, pure hard-coded script.
 * Exposes window.startLifetopiaDemo() for console trigger.
 */

import type { GameState } from "./Game";
import { FARM_GRID } from "./Game";
import { handleToolAction, spawnText } from "./GameEngine";
import { AudioManager } from "./AudioSystem";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface DemoAPI {
  stateRef: { current: GameState };
  setDs: (s: GameState) => void;
  selectTool: (id: string) => void;
  doSwitchMap: (map: string) => void;
  setActivePanel: (panel: string | null) => void;
  setSplashDone: (v: boolean) => void;
  setIntroTutorialDone: (v: boolean) => void;
  setWalletConnected: (v: boolean) => void;
  setWalletAddress: (v: string) => void;
  triggerPopup: (text: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>((r, reject) => {
  const t = setTimeout(r, ms);
  // Poll abort every 50ms
  const check = setInterval(() => {
    if (demoAborted) { clearTimeout(t); clearInterval(check); reject(new Error("aborted")); }
  }, 50);
  setTimeout(() => clearInterval(check), ms + 100);
});

/** Get world-center of a farm plot by grid index (0-5, row-major) */
function plotCenter(gridIndex: number): { x: number; y: number } {
  const col = gridIndex % FARM_GRID.cols;
  const row = Math.floor(gridIndex / FARM_GRID.cols);
  return {
    x: FARM_GRID.startX + col * FARM_GRID.cellW + FARM_GRID.cellW / 2,
    y: FARM_GRID.startY + row * FARM_GRID.cellH + FARM_GRID.cellH / 2,
  };
}

/** Move player to target and wait until they arrive (max 4s) */
async function moveTo(api: DemoAPI, x: number, y: number): Promise<void> {
  const s = api.stateRef.current;
  s.player.targetX = x;
  s.player.targetY = y;
  s.player.running = true;
  // Wait until within 30px or timeout
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    await sleep(50);
    const p = api.stateRef.current.player;
    if (Math.hypot(p.x - x, p.y - y) < 30) break;
  }
  api.stateRef.current.player.running = false;
  api.stateRef.current.player.targetX = null;
  api.stateRef.current.player.targetY = null;
}

/** Select a tool by slot index (1-based) */
function selectSlot(api: DemoAPI, slot: number): void {
  const TOOL_IDS = [
    "sickle", "axe", "axe-large", "water",
    "wheat-seed", "tomato-seed", "carrot-seed", "pumpkin-seed",
  ];
  const id = TOOL_IDS[slot - 1];
  if (!id) return;
  api.stateRef.current.player.tool = id as any;
  api.setDs({ ...api.stateRef.current });
}

/** Click a farm plot by grid index — fires handleToolAction at plot center */
function clickPlot(api: DemoAPI, gridIndex: number): void {
  const { x, y } = plotCenter(gridIndex);
  // Convert world coords to canvas coords (apply camera + zoom)
  const s = api.stateRef.current;
  const canvasX = x * s.zoom - s.cameraX;
  const canvasY = y * s.zoom - s.cameraY;
  api.stateRef.current = handleToolAction(api.stateRef.current, canvasX, canvasY);
  api.setDs({ ...api.stateRef.current });
}

/** Force-mature all crops instantly (for demo time-skip) */
function forceRipenAll(api: DemoAPI): void {
  api.stateRef.current.farmPlots = api.stateRef.current.farmPlots.map(p => {
    if (!p.crop || p.crop.dead) return p;
    return {
      ...p,
      watered: true,
      stressDrySince: null,
      crop: {
        ...p.crop,
        stage: 4,
        ready: true,
        plantedAt: api.stateRef.current.time - p.crop.growTime - 1000,
      },
    };
  });
  api.setDs({ ...api.stateRef.current });
}

/** Show a demo caption notification */
function caption(api: DemoAPI, text: string, life = 140): void {
  api.stateRef.current.notification = { text, life };
  api.setDs({ ...api.stateRef.current });
}

// ── Main Demo Script ──────────────────────────────────────────────────────────
let demoRunning = false;
let demoAborted = false;
let currentDemoAPI: DemoAPI | null = null;

/** Call this to abort a running demo and reset the farm plots */
export function abortDemo(): void {
  demoAborted = true;
  demoRunning = false;
  if (currentDemoAPI) {
    const s = currentDemoAPI.stateRef.current;
    // Clean up land area immediately so player starts fresh
    s.demoMode = false;
    currentDemoAPI.setWalletConnected(false);
    currentDemoAPI.setWalletAddress("");
    s.player.walletAddress = "";
    s.currentMap = "home"; // Return to farm screen automatically on skip
    s.notification = { text: "DEMO SKIPPED — PLEASE CONNECT WALLET", life: 100 };
    s.farmPlots = s.farmPlots.map(p => ({
      ...p,
      tilled: false,
      watered: false,
      fertilized: false,
      crop: null,
      stressDrySince: null,
    }));
    currentDemoAPI.setDs({ ...s });
  }
}

export async function runDemoScript(api: DemoAPI): Promise<void> {
  if (demoRunning) { console.warn("[Demo] Already running"); return; }
  demoRunning = true;
  demoAborted = false;

  try {

  // ── SETUP ─────────────────────────────────────────────────────────────────
  // If triggered from tutorial finish, splash/tutorial are already done — skip those
  const alreadyInGame = api.stateRef.current.currentMap === "home";
  if (!alreadyInGame) {
    api.setSplashDone(true);
    api.setIntroTutorialDone(true);
    api.setWalletConnected(true);
    api.setWalletAddress("demoFarmer");
    api.stateRef.current.player.walletAddress = "demoFarmer";
  }
  api.setActivePanel(null);
  api.stateRef.current.currentMap = "home";
  api.stateRef.current.player.gold = 50;
  api.stateRef.current.player.inventory = {
    "wheat-seed": 6, "tomato-seed": 6, "carrot-seed": 6, "pumpkin-seed": 6,
    wheat: 0, tomato: 0, carrot: 0, pumpkin: 0,
  };
  // Reset all plots to untilled for a clean demo
  api.stateRef.current.farmPlots = api.stateRef.current.farmPlots.map(p => ({
    ...p, tilled: false, watered: false, fertilized: false, crop: null, stressDrySince: null,
  }));
  // Lock user input
  api.stateRef.current.demoMode = true;
  api.setDs({ ...api.stateRef.current });

  AudioManager.init();
  AudioManager.playBGM("/backsound.mp3");

  await sleep(1000);

  // ── STEP 1: Move to Plot 0, till it ──────────────────────────────────────
  caption(api, "STEP 1 — SELECT HOE (SLOT 1) TO TILL SOIL");
  selectSlot(api, 1); // HOE
  await sleep(1800);
  caption(api, "STEP 1 — WALK TO PLOT AND CLICK TO TILL");
  await moveTo(api, plotCenter(0).x, plotCenter(0).y);
  await sleep(600);
  clickPlot(api, 0);
  await sleep(1200);

  // ── STEP 2: Plant wheat on Plot 0 ────────────────────────────────────────
  caption(api, "STEP 2 — SELECT WHEAT SEED (SLOT 5) TO PLANT");
  selectSlot(api, 5); // WHEAT SEED
  await sleep(1800);
  caption(api, "STEP 2 — CLICK TILLED PLOT TO PLANT SEED");
  clickPlot(api, 0);
  await sleep(1200);

  // ── STEP 3: Move to Plot 1, till + plant ─────────────────────────────────
  caption(api, "STEP 1 — TILL THE NEXT PLOT WITH HOE");
  selectSlot(api, 1); // HOE
  await sleep(1200);
  await moveTo(api, plotCenter(1).x, plotCenter(1).y);
  await sleep(600);
  clickPlot(api, 1);
  await sleep(1200);

  caption(api, "STEP 2 — PLANT WHEAT SEED ON TILLED SOIL");
  selectSlot(api, 5); // WHEAT SEED
  await sleep(1200);
  clickPlot(api, 1);
  await sleep(1200);

  // ── STEP 4: Till + plant plots 2-5 ───────────────────────────────────────
  for (let i = 2; i < 6; i++) {
    caption(api, `TILLING AND PLANTING PLOT ${i + 1}...`);
    selectSlot(api, 1);
    await sleep(800);
    await moveTo(api, plotCenter(i).x, plotCenter(i).y);
    await sleep(500);
    clickPlot(api, i);
    await sleep(900);
    selectSlot(api, 5);
    await sleep(600);
    clickPlot(api, i);
    await sleep(900);
  }

  // ── STEP 5: Water all plots ───────────────────────────────────────────────
  caption(api, "STEP 3 — SELECT WATER CAN (SLOT 4) TO WATER CROPS");
  selectSlot(api, 4); // WATER CAN
  await sleep(2000);
  caption(api, "STEP 3 — CLICK EACH PLOT TO WATER IT");
  for (let i = 0; i < 6; i++) {
    await moveTo(api, plotCenter(i).x, plotCenter(i).y);
    await sleep(400);
    clickPlot(api, i);
    await sleep(900);
  }

  // ── STEP 6: Time-skip — force all crops to mature ────────────────────────
  caption(api, "CROPS ARE GROWING... WAIT FOR THEM TO RIPEN");
  await sleep(2500);
  forceRipenAll(api);
  api.stateRef.current.shake = 12;
  api.triggerPopup("ALL CROPS READY TO HARVEST!");
  caption(api, "CROPS ARE READY! SELECT HOE AND HARVEST!");
  await sleep(2000);

  // ── STEP 7: Harvest all plots ─────────────────────────────────────────────
  caption(api, "STEP 4 — SELECT HOE (SLOT 1) TO HARVEST READY CROPS");
  selectSlot(api, 1); // HOE
  await sleep(2000);
  caption(api, "STEP 4 — CLICK EACH RIPE CROP TO HARVEST AND EARN GOLD");
  for (let i = 0; i < 6; i++) {
    await moveTo(api, plotCenter(i).x, plotCenter(i).y);
    await sleep(400);
    clickPlot(api, i);
    spawnText(
      api.stateRef.current,
      plotCenter(i).x,
      plotCenter(i).y - 40,
      "+GOLD",
      "#FFD700",
      -2.5,
    );
    api.setDs({ ...api.stateRef.current });
    await sleep(1000);
  }

  // ── STEP 8: Walk toward city ──────────────────────────────────────────────
  caption(api, "VISIT CITY SHOP TO BUY MORE SEEDS WITH YOUR GOLD");
  await sleep(1500);
  await moveTo(api, 900, 400);
  await sleep(1000);

  // ── STEP 9: Show quest panel — harvest quest complete ─────────────────────
  caption(api, "CHECK YOUR DAILY TASKS — HARVEST QUEST COMPLETE!");
  api.triggerPopup("QUEST COMPLETE! HARVEST 5 CROPS DONE!");
  await sleep(1200);
  api.setActivePanel("quests");
  await sleep(4000);
  api.setActivePanel(null);

    // ── DONE ──────────────────────────────────────────────────────────────────
    caption(api, "DEMO DONE! NOW IT IS YOUR TURN — CONNECT WALLET!");
    api.stateRef.current.demoMode = false;
    api.setWalletConnected(false);
    api.setWalletAddress("");
    api.stateRef.current.player.walletAddress = "";
    api.setDs({ ...api.stateRef.current });
    demoRunning = false;

  } catch {
    // Aborted or error — clean up immediately
    api.stateRef.current.demoMode = false;
    api.stateRef.current.notification = null;
    api.setDs({ ...api.stateRef.current });
    demoRunning = false;
    demoAborted = false;
  }
}

/** Register window.startLifetopiaDemo() */
export function registerDemoTrigger(api: DemoAPI): void {
  currentDemoAPI = api;
  (window as any).startLifetopiaDemo = () => {
    console.log("[Lifetopia] Starting autopilot demo...");
    runDemoScript(api).catch(console.error);
  };
  console.log("[Lifetopia] Demo ready — run window.startLifetopiaDemo() to start");
}
