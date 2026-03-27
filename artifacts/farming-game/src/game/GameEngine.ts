import {
  GameState,
  FarmPlot,
  Crop,
  VFXParticle,
  DamageNumber,
  NPC,
  Quest,
  CROP_GROW_TIMES,
  CROP_GOLD_REWARDS,
  MAP_COLLISIONS,
  MAP_PLAYER_START,
  MAP_SIZES,
  MapType,
  FARM_GRID,
  SHOP_ITEMS,
  CollisionRect,
  Tree,
  GARDEN_ROAD_Y,
  Footprint,
  applyFarmBalancePreset,
  FARM_BALANCE_PRESETS,
  FarmBalancePreset,
} from "./Game";
import { AudioManager } from "./AudioSystem";

export function createInitialState(): GameState {
  const s: GameState = {
    player: {
      x: MAP_PLAYER_START.home.x,
      y: MAP_PLAYER_START.home.y,
      hp: 23,
      maxHp: 25,
      level: 1,
      exp: 0,
      maxExp: 100,
      gold: 0,
      facing: "down",
      moving: false,
      running: false,
      speed: 2.5,
      tool: null,
      inventory: {
        "wheat-seed": 10,
        "tomato-seed": 10,
        "carrot-seed": 10,
        "pumpkin-seed": 10,
        wheat: 0,
        tomato: 0,
        carrot: 0,
        seeds: 0,
      },
      animFrame: 0,
      animTimer: 0,
      action: null,
      actionTimer: 0,
      targetX: null,
      targetY: null,
      tutorialStep: 0,
      harvestCount: 0, // Added to track 1st harvest unlock
      lifetopiaGold: 0,
      walletAddress: "GuestFarmer",
      jumpY: 0,
      jumpFlip: 0,
      jumpCount: 0,
    },
    currentMap: "home",
    farmPlots: createFarmPlots(),
    vfxParticles: [],
    damageNumbers: [],
    quests: [
      {
        id: "q1",
        title: "Beginner! Harvest 5 crops",
        description: "Harvest 5 crops",
        type: "harvest",
        target: 5,
        current: 0,
        reward: 30,
        completed: false,
      },
      {
        id: "q2",
        title: "Green Thumb",
        description: "Plant 10 seeds",
        type: "plant",
        target: 10,
        current: 0,
        reward: 20,
        completed: false,
      },
      {
        id: "q3",
        title: "Golden Farmer",
        description: "Earn 150 GOLD",
        type: "earn",
        target: 150,
        current: 0,
        reward: 50,
        completed: false,
      },
      {
        id: "q4",
        title: "Chop 5 Trees",
        description: "Chop 5 Trees (0/5)",
        type: "chop",
        target: 5,
        current: 0,
        reward: 25,
        completed: false,
      },
      {
        id: "q5",
        title: "Fisher!",
        description: "Catch 3 fish",
        type: "fish",
        target: 3,
        current: 0,
        reward: 35,
        completed: false,
      },
    ],
    npcs: createNPCs(),
    fishBobber: {
      active: false,
      x: 0,
      y: 0,
      bobTimer: 0,
      biting: false,
      biteTimer: 0,
    },
    zoom: 1.8,
    targetZoom: 1.8,
    cameraX: 0,
    cameraY: 0,
    keys: new Set(),
    time: 0,
    notification: null,
    bubbleText: "WELCOME TO LIFETOPIA!",
    shopOpen: false,
    shopItems: SHOP_ITEMS,
    fishingActive: false,
    activePanel: null,
    particleId: 0,
    damageId: 0,
    trees: createHomeTrees(),
    footprints: [],
    hoveredPlotId: null,
    harvestLocked: false,
    pendingPlotAction: null,
    demoMode: false,
    demoTimer: 0,
    tutorialActive: false,
    showFarmDebugOverlay: false,
    farmBalancePreset: "normal",
  };

  applyFarmBalancePreset(s.farmBalancePreset);

  // Start clean: player must actually farm from scratch on home map

  return s;
}

function createHomeTrees(): Tree[] {
  return [
    { id: "tree1", x: 100, y: 350, hp: 5, maxHp: 5, type: "oak" },
    { id: "tree2", x: 80, y: 500, hp: 10, maxHp: 10, type: "pine" },
    { id: "tree3", x: 920, y: 300, hp: 6, maxHp: 6, type: "oak" },
    { id: "rock1", x: 850, y: 450, hp: 4, maxHp: 4, type: "rock" },
    { id: "rock2", x: 200, y: 150, hp: 8, maxHp: 8, type: "rock" },
  ];
}

function createFarmPlots(): FarmPlot[] {
  const plots: FarmPlot[] = [];
  const { cols, rows, cellW, cellH, startX, startY } = FARM_GRID;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      plots.push({
        id: `plot-${row}-${col}`,
        gridX: col,
        gridY: row,
        worldX: startX + col * cellW,
        worldY: startY + row * cellH,
        tilled: false,
        watered: false,
        fertilized: false,
        crop: null,
      });
    }
  }
  return plots;
}

function createNPCs(): NPC[] {
  return [
    {
      id: "npc1",
      x: 320,
      y: 420,
      name: "FRIEND 1",
      color: "#FF6B6B",
      vx: 0,
      vy: 0,
      moveTimer: 0,
    },
    {
      id: "npc2",
      x: 700,
      y: 380,
      name: "FRIEND 2",
      color: "#6BBBFF",
      vx: 0,
      vy: 0,
      moveTimer: 60,
    },
    {
      id: "npc3",
      x: 500,
      y: 460,
      name: "FRIEND 3",
      color: "#90EE90",
      vx: 0,
      vy: 0,
      moveTimer: 30,
    },
  ];
}

export function updateGame(state: GameState, dt: number): GameState {
  const s = {
    ...state,
    player: { ...state.player },
    vfxParticles: [...state.vfxParticles],
    damageNumbers: [...state.damageNumbers],
  };
  s.time += dt;
  if (s.demoMode && !s.tutorialActive) updateDemoLogic(s, dt);
  handleMovement(s, dt);
  updateCamera(s);
  updateZoom(s);
  updateCrops(s);
  updateVFX(s);
  updateDamageNumbers(s);
  updatePlayerAnim(s, dt);
  updatePlayerAction(s, dt);
  updateNotification(s, dt);

  // ACROBATIC JUMP & FLIP PHYSICS (SPACE BAR)
  const p = s.player;
  if (s.keys.has(" ") && p.jumpCount < 2 && p.jumpY > -20) {
    p.jumpCount++;
    p.jumpY = -35; // Initial burst
    p.jumpFlip = 0;
  }

  if (p.jumpCount > 0 || p.jumpY < 0) {
    p.jumpY += 2; // Gravity
    p.jumpFlip += 15; // Rotate 360 over the jump duration
    if (p.jumpY >= 0) {
      p.jumpY = 0;
      p.jumpCount = 0;
      p.jumpFlip = 0;
    }
  }

  if (s.currentMap === "garden") updateNPCs(s, dt);
  if (s.currentMap === "fishing" && s.fishBobber.active) updateFishing(s, dt);
  if (s.player.action === "water" && s.player.actionTimer > 0) {
    const p = s.player;
    let wx = p.x,
      wy = p.y - 15;
    if (p.facing === "right") wx += 25;
    else if (p.facing === "left") wx -= 25;
    else if (p.facing === "up") wy -= 25;
    else if (p.facing === "down") wy += 15;
    for (let i = 0; i < 7; i++) {
      if (Math.random() > 0.1)
        spawnVFX(
          s,
          // The HTML img tag is syntactically incorrect here.
          // Assuming it was meant as a comment or a visual cue for the user.
          // Removing the HTML tag to maintain valid TypeScript syntax.
          // <img
          //    src="/tangan.png"
          //    style={{
          //      width: 80,
          //      height: 80,
          //      imageRendering: 'pixelated',
          //      transform: 'rotate(-45deg)'
          //    }}
          // />
          wx + (Math.random() - 0.5) * 25,
          wy + (Math.random() - 0.5) * 25,
          "water",
        );
    }
  }
  if (s.player.action === "fertilizer" && s.player.actionTimer > 0) {
    const p = s.player;
    if (Math.random() > 0.5)
      spawnVFX(s, p.x + (Math.random() - 0.5) * 40, p.y - 10, "sparkle");
  }

  // Update hovered plot (nearest plot to player)
  {
    const { cellW, cellH } = FARM_GRID;
    let nearId: string | null = null;
    let nearDist = 90;
    for (const plot of s.farmPlots) {
      const cx = FARM_GRID.startX + plot.gridX * cellW + cellW / 2;
      const cy = FARM_GRID.startY + plot.gridY * cellH + cellH / 2;
      const d = Math.hypot(cx - s.player.x, cy - s.player.y);
      if (d < nearDist) {
        nearDist = d;
        nearId = plot.id;
      }
    }
    s.hoveredPlotId = nearId;

    // Dynamic bubble text based on tool + hovered plot state
    const tool = s.player.tool;
    const plot = nearId ? s.farmPlots.find((p) => p.id === nearId) : null;
    if (s.player.action && s.player.actionTimer > 0) {
      // During action — show what's happening
      if (s.player.action === "water") s.bubbleText = "Splosh! Done.";
      else if (
        s.player.action === "hoe" ||
        s.player.action === "shovel" ||
        s.player.action === "sickle"
      )
        s.bubbleText = "Soil prepared!";
      else if ((s.player.action as string).includes("seed"))
        s.bubbleText = "Planted!";
      else if (s.player.action === "fertilizer")
        s.bubbleText = "Growth boosted!";
      else if (s.player.action === "axe") s.bubbleText = "Timber!";
    } else if (tool && plot) {
      // Tool selected + near a plot — context-aware hint
      if (tool === "hoe" || tool === "shovel" || tool === "sickle") {
        if (!plot.tilled) s.bubbleText = "Till this soil!";
        else if (plot.crop?.ready) s.bubbleText = "Harvest time!";
        else if (plot.crop) s.bubbleText = "Crop still growing...";
        else s.bubbleText = "Ready for seeds!";
      } else if (tool === "water") {
        s.bubbleText = plot.watered
          ? "Already wet. Let it grow."
          : "This soil looks thirsty.";
      } else if (tool === "fertilizer") {
        s.bubbleText = plot.fertilized
          ? "Already fertilized!"
          : "Fertilize for faster growth!";
      } else if (tool?.endsWith("-seed")) {
        if (!plot.tilled) s.bubbleText = "Till the soil first!";
        else if (plot.crop) s.bubbleText = "Plot already growing!";
        else s.bubbleText = `Plant ${tool.split("-")[0]}!`;
      }
    } else if (tool && !plot) {
      // Tool selected, not near plot
      if (tool === "hoe" || tool === "shovel" || tool === "sickle")
        s.bubbleText = "Till the bare soil!";
      else if (tool === "water") s.bubbleText = "Water your growing crops!";
      else if (tool === "fertilizer")
        s.bubbleText = "Fertilize the tilled soil!";
      else if (tool === "axe") s.bubbleText = "Chop trees for gold!";
      else if (tool?.endsWith("-seed"))
        s.bubbleText = `Plant ${tool.split("-")[0]}!`;
    } else if (!tool) {
      // No tool — map/tutorial guidance
      if (s.currentMap === "city")
        s.bubbleText = "Visit the shop to buy seeds!";
      else if (s.currentMap === "fishing")
        s.bubbleText = s.fishingActive ? "Reel it in fast!" : "Cast your line!";
      else if (s.currentMap === "garden") s.bubbleText = "Chat with friends!";
      else if (s.currentMap === "suburban")
        s.bubbleText = "Welcome to the suburbs!";
      else s.bubbleText = "Select a tool to start farming!";
    }
  }

  // Footprints — spawn when moving, alternate left/right foot
  s.footprints = [...(state.footprints || [])];
  const fp = s.player;
  if (fp.moving && Math.floor(s.time / 18) !== Math.floor((s.time - dt) / 18)) {
    const foot: "left" | "right" =
      Math.floor(s.time / 18) % 2 === 0 ? "left" : "right";
    const offset = foot === "left" ? -5 : 5;
    const perpX = fp.facing === "up" || fp.facing === "down" ? offset : 0;
    const perpY = fp.facing === "left" || fp.facing === "right" ? offset : 0;
    s.footprints.push({
      x: fp.x + perpX,
      y: fp.y + 8 + perpY,
      facing: fp.facing,
      life: 180,
      maxLife: 180,
      foot,
    });
  }
  // Fade and remove old footprints
  s.footprints = s.footprints
    .map((f) => ({ ...f, life: f.life - dt }))
    .filter((f) => f.life > 0)
    .slice(-40); // max 40 footprints at once

  return s;
}

function executePlotAction(s: GameState, plotId: string, tool: string) {
  // PROGRESSION LOCK: Unlock ALL plots as soon as the player plants their first seed (Step 7)
  if (s.player.tutorialStep < 7 && plotId !== "plot-0-0") {
    s.notification = { text: "PLANT AT LEAST ONE CROP TO UNLOCK ALL! 🏡", life: 80 };
    return s;
  }

  const idx = s.farmPlots.findIndex((p) => p.id === plotId);
  if (idx === -1) return s;
  const plot = { ...s.farmPlots[idx] };
  const { cellW, cellH } = FARM_GRID;
  const cx = FARM_GRID.startX + plot.gridX * cellW + cellW / 2;
  const cy = FARM_GRID.startY + plot.gridY * cellH + cellH / 2;

  const isSoilTool = tool === "hoe" || tool === "shovel" || tool === "sickle";

  if (isSoilTool) {
    // Celurit/hoe/shovel: if crop ready → harvest immediately, gold to player
    if (plot.crop?.ready) {
      const ct = plot.crop.type;
      const preset = FARM_BALANCE_PRESETS[s.farmBalancePreset];
    const baseGold = preset.goldRewards[plot.crop.type] || 5;
    const gold = plot.crop.isRare ? baseGold * 3 : baseGold;
    const exp = Math.floor(10 * preset.expMultiplier * (plot.crop.isRare ? 2 : 1));
      s.player.gold += gold;
      s.player.exp += exp;
      s.player.action = tool as any;
      s.player.actionTimer = 35;
      s.player.inventory = {
        ...s.player.inventory,
        [ct]: (s.player.inventory[ct] || 0) + 1,
      };
      spawnVFX(s, cx, cy - 20, "harvest");
      spawnVFX(s, cx, cy - 20, "coin");
      spawnText(s, cx, cy - 40, `+${gold}G`, "#FFD700");
      advanceQuest(s, "harvest");
      advanceQuest(s, "earn");
      AudioManager.playSFX("harvest"); // Added for premium feel
      // Unlock progression
      s.player.harvestCount++;
      if (s.player.tutorialStep < 10) s.player.tutorialStep = 10;
      
      plot.crop = null;
      plot.watered = false;
      plot.fertilized = false;
      s.notification = { text: `+${gold}G`, life: 100 };
      handleLevelUp(s, s.player.x, s.player.y);
    } else if (!plot.tilled) {
      plot.tilled = true;
      s.player.action = tool as any;
      s.player.actionTimer = 35;
      AudioManager.playSFX("hoe"); // Added for feedback
      spawnVFX(s, cx, cy, "sparkle");
      spawnVFX(s, cx, cy, "dust");
      s.notification = { text: "SOIL TILLED!", life: 80 };
    } else if (plot.crop) {
      s.notification = { text: "STILL GROWING...", life: 80 };
    } else {
      s.notification = { text: "READY FOR SEEDS!", life: 80 };
    }
  } else if (tool === "water") {
    if (!plot.tilled) {
      s.notification = { text: "TILL SOIL FIRST!", life: 70 };
    } else {
      if (plot.watered) {
        s.notification = { text: "ALREADY WATERED!", life: 60 };
      } else {
        plot.watered = true;
        s.player.action = "water" as any;
        s.player.actionTimer = 35;
        AudioManager.playSFX("water"); // Added for immersive splash
        for (let i = 0; i < 10; i++)
          spawnVFX(
            s,
            cx + (Math.random() - 0.5) * 35,
            cy + (Math.random() - 0.5) * 25,
            "water",
          );
        s.notification = { text: "WATERED!", life: 80 };
      }
    }
  } else if (tool === "fertilizer") {
    if (!plot.tilled) {
      s.notification = { text: "TILL SOIL FIRST!", life: 70 };
    } else {
      if (plot.fertilized) {
        s.notification = { text: "ALREADY FERTILIZED!", life: 60 };
      } else {
        plot.fertilized = true;
        s.player.action = "fertilizer" as any;
        s.player.actionTimer = 30;
        spawnVFX(s, cx, cy, "sparkle");
        s.notification = { text: "GROWTH BOOSTED!", life: 80 };
      }
    }
  } else if (tool.endsWith("-seed")) {
    let cropType: "wheat" | "tomato" | "carrot" | "pumpkin" = "wheat";
    if (tool.includes("tomato")) cropType = "tomato";
    else if (tool.includes("carrot")) cropType = "carrot";
    else if (tool.includes("pumpkin")) cropType = "pumpkin";
    const count = s.player.inventory[tool] || 0;

    if (!plot.tilled) {
      s.notification = { text: "TILL SOIL FIRST!", life: 80 };
    } else if (plot.crop) {
      s.notification = { text: "ALREADY PLANTED!", life: 80 };
    } else if (count <= 0) {
      s.notification = {
        text: `NO ${cropType.toUpperCase()} SEEDS!`,
        life: 80,
      };
    } else {
      plot.crop = makeCrop(cropType, s.time, s.farmBalancePreset);
      // FIX: Keep watered status if already wet (Harvest Moon style)
      // plot.watered stays as is
      plot.fertilized = false;
      s.player.action = "seed" as any;
      s.player.actionTimer = 30;
      AudioManager.playSFX("plant"); // Thud sound
      s.player.inventory = { ...s.player.inventory, [tool]: count - 1 };
      spawnVFX(s, cx, cy, "plant");
      s.notification = { text: `PLANTED ${cropType.toUpperCase()}!`, life: 90 };
      advanceQuest(s, "plant");
    }
  }

  s.farmPlots[idx] = plot;
  return s;
}

function collides(px: number, py: number, rects: CollisionRect[]): boolean {
  // Player hitbox (smaller for better precision)
  const pw = 12,
    ph = 10;
  for (const r of rects) {
    if (
      px - pw < r.x + r.w &&
      px + pw > r.x &&
      py - ph < r.y + r.h &&
      py + ph > r.y
    )
      return true;
  }
  return false;
}

function handleMovement(s: GameState, _dt: number) {
  const p = s.player;
  const diff = FARM_BALANCE_PRESETS[s.farmBalancePreset];
  const baseSpeed = p.speed + diff.playerSpeedBonus;
  const speed = p.running ? baseSpeed * 1.9 : baseSpeed;
  let dx = 0,
    dy = 0;

  // Point-and-click Travel Logic
  if (p.targetX !== null && p.targetY !== null) {
    const dist = Math.hypot(p.targetX - p.x, p.targetY - p.y);
    if (dist > 8) {
      dx = ((p.targetX - p.x) / dist) * speed;
      dy = ((p.targetY - p.y) / dist) * speed;
      p.facing =
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? "right"
            : "left"
          : dy > 0
            ? "down"
            : "up";
    } else {
      p.targetX = null;
      p.targetY = null;
      // Fire pending plot action when player arrives
      if (s.pendingPlotAction && s.currentMap === "home") {
        executePlotAction(
          s,
          s.pendingPlotAction.plotId,
          s.pendingPlotAction.tool,
        );
        s.pendingPlotAction = null;
      }
    }
  }

  // KEYBOARD OVERRIDE: Reset target if keys pressed
  if (
    s.keys.size > 0 &&
    (s.keys.has("w") ||
      s.keys.has("a") ||
      s.keys.has("s") ||
      s.keys.has("d") ||
      s.keys.has("arrowup"))
  ) {
    p.targetX = null;
    p.targetY = null;
    dx = 0;
    dy = 0;
    if (s.keys.has("w") || s.keys.has("arrowup")) {
      dy -= speed;
      p.facing = "up";
    }
    if (s.keys.has("s") || s.keys.has("arrowdown")) {
      dy += speed;
      p.facing = "down";
    }
    if (s.keys.has("a") || s.keys.has("arrowleft")) {
      dx -= speed;
      p.facing = "left";
    }
    if (s.keys.has("d") || s.keys.has("arrowright")) {
      dx += speed;
      p.facing = "right";
    }
  }

  p.moving = dx !== 0 || dy !== 0;
  if (p.moving && p.tutorialStep === 0) p.tutorialStep = 1;

  // SPAWN FOOTSTEP DUST IF MOVING (Smoother & Less Excessive)
  if (p.moving && s.time % 20 < 1) {
    spawnVFX(s, p.x, p.y + 10, "dust");
  }

  const collisions = MAP_COLLISIONS[s.currentMap];
  const { w, h } = MAP_SIZES[s.currentMap];

  const newX = p.x + dx;
  const newY = p.y + dy;

  if (!collides(newX, p.y, collisions))
    p.x = Math.max(16, Math.min(w - 16, newX));
  if (!collides(p.x, newY, collisions))
    p.y = Math.max(16, Math.min(h - 16, newY));
}

function updateCamera(s: GameState) {
  const cw = 1280,
    ch = 720;
  const { w, h } = MAP_SIZES[s.currentMap];
  const tx = s.player.x * s.zoom - cw / 2;
  const ty = s.player.y * s.zoom - ch / 2;
  const maxCX = Math.max(0, w * s.zoom - cw);
  const maxCY = Math.max(0, h * s.zoom - ch);
  s.cameraX += (Math.max(0, Math.min(maxCX, tx)) - s.cameraX) * 0.09;
  s.cameraY += (Math.max(0, Math.min(maxCY, ty)) - s.cameraY) * 0.09;
}

function updateZoom(s: GameState) {
  s.zoom += (s.targetZoom - s.zoom) * 0.06;
}

function updateCrops(s: GameState) {
  const now = s.time;
  s.farmPlots = s.farmPlots.map((plot) => {
    if (!plot.crop) return plot;

    // Crop growth requires water
    if (!plot.watered) return plot;

    const gtBase =
      CROP_GROW_TIMES[plot.crop.type] || plot.crop.growTime || 20000;
    const gt = plot.fertilized ? Math.max(3000, gtBase / 2) : gtBase;
    const elapsed = Math.max(0, now - plot.crop.plantedAt);
    const prog = Math.min(elapsed / gt, 1);

    let stage: 0 | 1 | 2 | 3 | 4 = 0;
    if (prog >= 0.2) stage = 1;
    if (prog >= 0.45) stage = 2;
    if (prog >= 0.75) stage = 3;
    if (prog >= 1.0) stage = 4;

    if (stage > plot.crop.stage) {
      const cellW = FARM_GRID.cellW;
      const cellH = FARM_GRID.cellH;
      const cx = FARM_GRID.startX + plot.gridX * cellW + cellW / 2;
      const cy = FARM_GRID.startY + plot.gridY * cellH + cellH / 2;
      spawnVFX(s, cx, cy - 20, "plant");
    }

    return {
      ...plot,
      crop: {
        ...plot.crop,
        growTime: gt,
        stage,
        ready: prog >= 1,
      },
    };
  });
}

function updateVFX(s: GameState) {
  s.vfxParticles = s.vfxParticles
    .map((p) => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.07,
      vx: p.vx * 0.97,
      life: p.life - 1,
      size: p.size * 0.98,
    }))
    .filter((p) => p.life > 0);
}

function updateDamageNumbers(s: GameState) {
  s.damageNumbers = s.damageNumbers
    .map((d) => ({ ...d, y: d.y - 1.2, life: d.life - 1 }))
    .filter((d) => d.life > 0);
}
function updatePlayerAnim(s: GameState, dt: number) {
  s.player.animTimer += dt;
  const frameTime = s.player.running ? 5 : 8;
  if (s.player.animTimer >= frameTime) {
    s.player.animTimer = 0;
    if (s.player.moving) {
      s.player.animFrame = (s.player.animFrame + 1) % 4;
    } else {
      s.player.animFrame = 0;
    }
  }
}

function updateNotification(s: GameState, dt: number) {
  if (s.notification) {
    s.notification = { ...s.notification, life: s.notification.life - dt };
    if (s.notification.life <= 0) s.notification = null;
  }
}

function updateNPCs(s: GameState, _dt: number) {
  s.npcs = s.npcs.map((npc) => {
    const n = { ...npc };
    n.moveTimer--;
    if (n.moveTimer <= 0) {
      const angle = Math.random() * Math.PI * 2;
      n.vx = Math.cos(angle) * 0.8;
      n.vy = Math.sin(angle) * 0.8;
      n.moveTimer = 80 + Math.random() * 120;
    }
    const { w } = MAP_SIZES.garden;
    const { min, max } = GARDEN_ROAD_Y;
    n.x = Math.max(60, Math.min(w - 60, n.x + n.vx));
    n.y = Math.max(min, Math.min(max, n.y + n.vy)); // Use the road range
    return n;
  });
}

function updateFishing(s: GameState, dt: number) {
  const b = s.fishBobber;
  const newB = { ...b };
  newB.bobTimer += dt * 0.05;
  if (!newB.biting) {
    newB.biteTimer -= 1;
    if (newB.biteTimer <= 0) {
      newB.biting = true;
      newB.biteTimer = 60 + Math.random() * 90;
    }
  }
  s.fishBobber = newB;
}

let _pid = 0,
  _did = 0;

export function spawnVFX(
  s: GameState,
  x: number,
  y: number,
  type: "harvest" | "plant" | "water" | "coin" | "sparkle" | "fish" | "dust",
) {
  const palettes: Record<string, string[]> = {
    harvest: ["#FFD700", "#FFA500", "#FF6347", "#90EE90"],
    plant: ["#90EE90", "#228B22", "#7CFC00", "#ADFF2F"],
    water: ["#00BFFF", "#1E90FF", "#87CEEB"],
    coin: ["#FFD700", "#FFC200"],
    sparkle: ["#FFD700", "#FFF", "#FFE4B5"],
    fish: ["#1E90FF", "#00CED1", "#48D1CC", "#FFF"],
    dust: ["#C2B280", "#D2B48C", "#F5DEB3"], // Sand/Dust colors
  };
  const c = palettes[type] || ["#FFF"];
  const count = type === "dust" ? 4 : 14;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const speed =
      type === "dust" ? 0.4 + Math.random() * 0.8 : 1.2 + Math.random() * 3.5;
    s.vfxParticles.push({
      id: `p${_pid++}`,
      x: x + (Math.random() - 0.5) * 12,
      y: y + (Math.random() - 0.5) * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (type === "dust" ? 0.3 : 1.2),
      life: type === "dust" ? 30 + Math.random() * 20 : 55 + Math.random() * 35,
      maxLife: type === "dust" ? 50 : 90,
      color: c[Math.floor(Math.random() * c.length)],
      size: type === "dust" ? 3 + Math.random() * 4 : 2.5 + Math.random() * 5,
      type:
        type === "water"
          ? "drop"
          : type === "coin"
            ? "coin"
            : type === "fish"
              ? "bubble"
              : type === "sparkle"
                ? "sparkle"
                : type === "dust"
                  ? "dust"
                  : "leaf",
    });
  }
}

export function spawnText(
  s: GameState,
  x: number,
  y: number,
  text: string,
  color: string,
) {
  s.damageNumbers.push({
    id: `d${_did++}`,
    x,
    y,
    text,
    color,
    life: 80,
    maxLife: 80,
  });
}

function updatePlayerAction(s: GameState, dt: number) {
  if (s.player.actionTimer > 0) {
    s.player.actionTimer -= dt;
    if (s.player.actionTimer <= 0) {
      s.player.action = null;
    }
  }
}

export function handleToolAction(
  s: GameState,
  mouseX?: number,
  mouseY?: number,
): GameState {
  const ns = {
    ...s,
    player: { ...s.player },
    farmPlots: [...s.farmPlots],
    vfxParticles: [...s.vfxParticles],
    damageNumbers: [...s.damageNumbers],
    trees: [...s.trees],
  };
  const { x: px, y: py, tool } = ns.player;

  // Always move player to clicked position first
  if (mouseX !== undefined && mouseY !== undefined) {
    ns.player.targetX = mouseX;
    ns.player.targetY = mouseY;
  }

  // Fishing map — special handling
  if (ns.currentMap === "fishing") {
    handleFishingAction(ns);
    return ns;
  }

  // Convert click to world coords — Renderer uses translate(-cameraX,-cameraY) then scale(zoom,zoom)
  let tx = px,
    ty = py;
  if (mouseX !== undefined && mouseY !== undefined) {
    tx = (mouseX + ns.cameraX) / ns.zoom;
    ty = (mouseY + ns.cameraY) / ns.zoom;
  }

  // Always move player to clicked position
  ns.player.targetX = tx;
  ns.player.targetY = ty;

  // Non-farm maps: just move
  if (ns.currentMap !== "home") return ns;

  // No tool: just move
  if (!tool) {
    ns.notification = { text: "SELECT A TOOL!", life: 60 };
    return ns;
  }

  // Axe on trees/obstacles
  if (tool === "axe" || tool === "axe-large") {
    const treeIdx = ns.trees.findIndex(
      (t) => Math.hypot(t.x - tx, t.y - ty) < 100,
    );
    if (treeIdx !== -1) {
      const tree = { ...ns.trees[treeIdx] };
      tree.hp -= tool === "axe-large" ? 2 : 1; // Mega axe is stronger!
      ns.player.action = tool;
      ns.player.actionTimer = 20;
      spawnVFX(ns, tree.x, tree.y - 40, "coin");
      if (tree.hp <= 0) {
        ns.player.gold += 15;
        ns.player.exp += 25;
        spawnText(ns, tree.x, tree.y - 60, "+15G", "#FFD700");
        advanceQuest(ns, "chop");
        ns.trees.splice(treeIdx, 1);
        ns.notification = {
          text: `${tree.type.toUpperCase()} CLEARED! +15G`,
          life: 100,
        };
      } else {
        ns.trees[treeIdx] = tree;
      }
      return ns;
    }
  }

  // Find clicked plot — first try exact hit, then nearest to player
  let targetPlot = ns.farmPlots.find((p) => {
    const wx = FARM_GRID.startX + p.gridX * FARM_GRID.cellW;
    const wy = FARM_GRID.startY + p.gridY * FARM_GRID.cellH;
    return (
      tx >= wx &&
      tx <= wx + FARM_GRID.cellW &&
      ty >= wy &&
      ty <= wy + FARM_GRID.cellH
    );
  });

  // Fallback: nearest plot to click point within generous range
  if (!targetPlot) {
    let bestDist = 200;
    for (const p of ns.farmPlots) {
      const pcx =
        FARM_GRID.startX + p.gridX * FARM_GRID.cellW + FARM_GRID.cellW / 2;
      const pcy =
        FARM_GRID.startY + p.gridY * FARM_GRID.cellH + FARM_GRID.cellH / 2;
      const d = Math.hypot(pcx - tx, pcy - ty);
      if (d < bestDist) {
        bestDist = d;
        targetPlot = p;
      }
    }
  }

  // Also check nearest to player position (for when player is standing on plot)
  if (!targetPlot) {
    let bestDist = 120;
    for (const p of ns.farmPlots) {
      const pcx =
        FARM_GRID.startX + p.gridX * FARM_GRID.cellW + FARM_GRID.cellW / 2;
      const pcy =
        FARM_GRID.startY + p.gridY * FARM_GRID.cellH + FARM_GRID.cellH / 2;
      const d = Math.hypot(pcx - px, pcy - py);
      if (d < bestDist) {
        bestDist = d;
        targetPlot = p;
      }
    }
  }

  if (!targetPlot) return ns;

  // Move player to plot center
  ns.player.targetX =
    FARM_GRID.startX + targetPlot.gridX * FARM_GRID.cellW + FARM_GRID.cellW / 2;
  ns.player.targetY =
    FARM_GRID.startY + targetPlot.gridY * FARM_GRID.cellH + FARM_GRID.cellH / 2;

  // Execute action immediately
  executePlotAction(ns, targetPlot.id, tool);
  return ns;
}

function handleLevelUp(ns: GameState, px: number, py: number) {
  if (ns.player.exp >= ns.player.maxExp) {
    ns.player.level++;
    ns.player.exp -= ns.player.maxExp;
    ns.player.maxExp = Math.floor(ns.player.maxExp * 1.5);
    ns.player.maxHp += 5;
    ns.player.hp = Math.min(ns.player.hp + 5, ns.player.maxHp);
    spawnVFX(ns, px, py - 30, "sparkle");
    AudioManager.playSFX("levelUp"); // Prestige alert
    ns.notification = { text: `⭐ LEVEL UP! ${ns.player.level}!`, life: 130 };
  }
}

function handleFishingAction(s: GameState) {
  const b = s.fishBobber;
  if (!b.active) {
    // Player casts line
    s.fishBobber = {
      active: true,
      x: s.player.x + (s.player.facing === "right" ? 60 : s.player.facing === "left" ? -60 : 0),
      y: s.player.y + (s.player.facing === "down" ? 60 : s.player.facing === "up" ? -60 : 20),
      bobTimer: 0,
      biting: false,
      biteTimer: 80 + Math.random() * 120,
    };
    s.notification = { text: "🎣 Fishing! Wait for bite...", life: 120 };
  } else if (b.biting) {
    const fish = [
      "🐟 Common Fish +8G",
      "🐠 Rare Fish +15G",
      "🐡 Exotic Fish +25G",
    ];
    const golds = [8, 15, 25];
    const r = Math.floor(Math.random() * 3);
    s.player.gold += golds[r];
    spawnVFX(s, s.player.x, s.player.y - 20, "fish");
    spawnText(s, s.player.x, s.player.y - 40, `+${golds[r]}G`, "#00CED1");
    s.notification = { text: `🎣 Caught ${fish[r]}!`, life: 120 };
    advanceQuest(s, "fish");
    s.fishBobber = {
      active: false,
      x: 0,
      y: 0,
      bobTimer: 0,
      biting: false,
      biteTimer: 0,
    };
  } else {
    s.fishBobber = {
      active: false,
      x: 0,
      y: 0,
      bobTimer: 0,
      biting: false,
      biteTimer: 0,
    };
    s.notification = { text: "🎣 Too soon! Try again.", life: 80 };
  }
}

function makeCrop(
  type: "wheat" | "tomato" | "carrot" | "pumpkin",
  time: number,
  farmBalancePreset: FarmBalancePreset,
): Crop {
  const preset = FARM_BALANCE_PRESETS[farmBalancePreset];
  const isRare = Math.random() < preset.rareChance;
  const growTime = CROP_GROW_TIMES[type] || 20000;

  return {
    id: `c${time}-${Math.random()}`,
    type,
    plantedAt: time,
    growTime,
    stage: 0,
    ready: false,
    isRare,
  };
}

function advanceQuest(s: GameState, type: string) {
  s.quests = s.quests.map((q) => {
    if (q.completed || q.type !== type) return q;
    const nc = q.current + 1;
    const done = nc >= q.target;
    if (done) {
      s.player.gold += q.reward;
      spawnText(
        s,
        s.player.x,
        s.player.y - 60,
        `QUEST! +${q.reward}G`,
        "#FFD700",
      );
    }
    return { ...q, current: nc, completed: done };
  });
}

export function switchMap(s: GameState, map: MapType): GameState {
  const ns = {
    ...s,
    currentMap: map,
    activePanel: null, // CLEAR POPUPS ON SWITCH
    vfxParticles: [],
    damageNumbers: [],
    fishBobber: {
      active: false,
      x: 0,
      y: 0,
      bobTimer: 0,
      biting: false,
      biteTimer: 0,
    },
  };
  ns.player = { ...s.player, ...MAP_PLAYER_START[map] };
  ns.cameraX = 0;
  ns.cameraY = 0;
  return ns;
}

function updateDemoLogic(s: GameState, dt: number) {
  // 1. WORLD TOUR TIMER (Switch map every 15 seconds)
  s.demoTimer = (s.demoTimer || 0) + dt;
  const mapCycle: MapType[] = ["home", "city", "garden", "suburban", "fishing"];
  const mapDuration = 15000; // 15 seconds per location
  const nextTargetIdx = Math.floor(s.demoTimer / mapDuration) % mapCycle.length;
  const nextMap = mapCycle[nextTargetIdx];

  if (s.currentMap !== nextMap) {
    Object.assign(s, switchMap(s, nextMap));
    // Refresh demo plots if returning home
    if (nextMap === "home") {
      const crops = ["wheat", "tomato", "pumpkin", "carrot", "wheat", "tomato"];
      s.farmPlots = s.farmPlots.map((p, i) => {
        if (i < 6)
          return {
            ...p,
            tilled: true,
            watered: true,
            crop: {
              id: `crop-${i}`,
              type: crops[i] as any,
              plantedAt: Date.now() - 100000,
              growTime: 60000,
              stage: 4,
              ready: true,
            },
          };
        return p;
      });
    }
  }

  // 2. Map-specific action dispatch
  if (s.currentMap === "home") {
    updateDemoLogicFarm(s, dt);
  } else if (s.currentMap === "city") {
    updateDemoLogicCity(s, dt);
  } else if (s.currentMap === "garden") {
    updateDemoLogicGarden(s, dt);
  } else if (s.currentMap === "suburban") {
    updateDemoLogicSuburban(s, dt);
  } else if (s.currentMap === "fishing") {
    updateDemoLogicFishing(s, dt);
  }
}

function updateDemoLogicFarm(s: GameState, dt: number) {
  s.demoTimer = (s.demoTimer || 0) + dt;
  const plotCount = Math.min(s.farmPlots.length, 6);
  const cyclePerPlot = 3000;
  const totalCycle = plotCount * cyclePerPlot;
  const globalPhase = s.demoTimer % totalCycle;

  const currentPlotIndex = Math.floor(globalPhase / cyclePerPlot);
  const phase = globalPhase % cyclePerPlot;
  const p = s.farmPlots[currentPlotIndex];
  if (!p) return;

  s.player.targetX = p.worldX + 40;
  s.player.targetY = p.worldY + 30;

  const cropTypes = ["wheat", "tomato", "pumpkin", "carrot"];
  const myCrop = cropTypes[currentPlotIndex % cropTypes.length];

  if (phase < 800) {
    s.player.tool = "hoe";
    if (phase > 600 && phase < 700 && !p.tilled)
      executePlotAction(s, p.id, "hoe");
  } else if (phase < 1600) {
    const seedTool = (myCrop + "-seed") as any;
    s.player.tool = seedTool;
    if (phase > 1400 && phase < 1500 && !p.crop)
      executePlotAction(s, p.id, seedTool);
  } else if (phase < 2400) {
    s.player.tool = "water";
    if (phase > 2200 && phase < 2300) executePlotAction(s, p.id, "water");
  } else {
    s.player.tool = "sickle";
    if (phase > 2800 && phase < 2900 && p.crop?.ready)
      executePlotAction(s, p.id, "sickle");
  }
}

function updateDemoLogicCity(s: GameState, dt: number) {
  const p = s.player;
  const shops = [
    {
      x: 130,
      label: "SEED MARKET",
      text: "BROWSING SEEDS...",
      buy: "WHEAT SEED",
      cost: 5,
      panel: "inventory",
    },
    {
      x: 380,
      label: "TOOLS SHOP",
      text: "CHECKING TOOLS...",
      buy: "HOEL tool",
      cost: 25,
      panel: "inventory",
    },
    {
      x: 630,
      label: "VESTING HUB",
      text: "VESTING LIQ...",
      buy: "TOKEN INFO",
      cost: 0,
      panel: "wallet",
    },
    {
      x: 830,
      label: "SUPPLY HUB",
      text: "TRADING SUPPLY...",
      buy: "CARROT SEED",
      cost: 6,
      panel: "inventory",
    },
  ];

  const t = (Date.now() / 4500) % shops.length;
  const idx = Math.floor(t);
  const shop = shops[idx];

  p.targetX = shop.x;
  p.targetY = 460;
  p.tool = null;

  const dist = Math.abs(p.x - shop.x);
  if (dist < 15) {
    const phase = Date.now() % 4500;
    if (phase < 3000) {
      s.bubbleText = `CHECKING ${shop.label}... (E)`;
      s.activePanel = shop.panel; // OPEN REAL UI!
    } else {
      s.bubbleText = `SHOPPING (E)...`;
      s.activePanel = null; // CLOSE BEFORE MOVING
      // Simulate purchase once per visit
      if (phase > 3800 && phase < 3900 && s.player.gold >= shop.cost) {
        s.notification = { text: `PURCHASED: ${shop.buy}!`, life: 100 };
        if (shop.cost > 0) {
          s.player.gold -= shop.cost;
          spawnText(s, p.x, p.y - 40, `-${shop.cost}G`, "#FF8888");
        }
      }
    }
  } else {
    s.activePanel = null; // CLOSE WHILE WALKING
  }
}

function updateDemoLogicGarden(s: GameState, dt: number) {
  const p = s.player;
  const now = Date.now();
  const cx = 520,
    cy = 460;
  const angle = now / 3500;
  p.targetX = cx + Math.cos(angle) * 160;
  p.targetY = cy + Math.sin(angle) * 70;
  p.tool = null;
}

function updateDemoLogicSuburban(s: GameState, dt: number) {
  const p = s.player;
  const now = Date.now();
  p.targetX = 520 + Math.sin(now / 5000) * 450;
  p.targetY = 480;
  p.tool = null;
}

function updateDemoLogicFishing(s: GameState, dt: number) {
  const p = s.player;
  p.targetX = 520;
  p.targetY = 320;
  p.tool = null;
  p.facing = "up";
}
