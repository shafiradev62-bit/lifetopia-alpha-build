import {
  GameState, FarmPlot, Crop, VFXParticle, DamageNumber, Quest,
  CROP_GROW_TIMES, CROP_GOLD_REWARDS, CROP_COLORS, MapType
} from './Game';

export function createInitialState(): GameState {
  const farmPlots = createFarmPlots();
  const quests: Quest[] = [
    { id: 'q1', title: 'Beginner Harvest', description: 'Harvest 5 crops', type: 'harvest', target: 5, current: 0, reward: 30, completed: false },
    { id: 'q2', title: 'Green Thumb', description: 'Plant 10 seeds', type: 'plant', target: 10, current: 0, reward: 20, completed: false },
    { id: 'q3', title: 'Golden Farmer', description: 'Earn 150 GOLD', type: 'earn', target: 150, current: 0, reward: 50, completed: false },
    { id: 'q4', title: 'Chop 5 Trees', description: 'Chop 5 Trees (0/5)', type: 'chop', target: 5, current: 0, reward: 25, completed: false },
    { id: 'q5', title: 'Reach Level 2', description: 'Reach Level 2', type: 'earn', target: 100, current: 0, reward: 40, completed: false },
  ];

  return {
    player: {
      x: 820,
      y: 480,
      hp: 23,
      maxHp: 25,
      level: 1,
      exp: 0,
      maxExp: 100,
      gold: 0,
      facing: 'down',
      moving: false,
      speed: 3,
      tool: 'shovel',
      inventory: { wheat: 0, tomato: 0, carrot: 0, pumpkin: 0, seeds: 10, 'tomato-seed': 5 },
    },
    currentMap: 'home',
    crops: [],
    vfxParticles: [],
    damageNumbers: [],
    quests,
    zoom: 1.5,
    targetZoom: 1.5,
    cameraX: 0,
    cameraY: 0,
    keys: new Set(),
    farmPlots,
    time: 0,
    shopOpen: false,
    inventoryOpen: false,
    questsOpen: false,
    notification: null,
    playerAnimFrame: 0,
    playerAnimTimer: 0,
  };
}

function createFarmPlots(): FarmPlot[] {
  const plots: FarmPlot[] = [];
  const startX = 540;
  const startY = 280;
  const cellW = 64;
  const cellH = 48;
  const cols = 5;
  const rows = 3;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      plots.push({
        id: `plot-${row}-${col}`,
        gridX: col,
        gridY: row,
        worldX: startX + col * cellW,
        worldY: startY + row * cellH,
        tilled: true,
        watered: false,
        crop: null,
      });
    }
  }
  return plots;
}

let particleId = 0;
let damageId = 0;

export function spawnVFX(state: GameState, x: number, y: number, type: 'harvest' | 'plant' | 'water' | 'coin' | 'sparkle') {
  const colors = {
    harvest: ['#FFD700', '#FFA500', '#FF6347', '#90EE90'],
    plant: ['#90EE90', '#228B22', '#7CFC00', '#ADFF2F'],
    water: ['#00BFFF', '#1E90FF', '#87CEEB', '#ADD8E6'],
    coin: ['#FFD700', '#FFC200', '#FFB900'],
    sparkle: ['#FFD700', '#FFF', '#FFE4B5', '#FAFAD2'],
  };
  const c = colors[type];
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
    const speed = 1.5 + Math.random() * 3;
    state.vfxParticles.push({
      id: `p${particleId++}`,
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 60 + Math.random() * 40,
      maxLife: 100,
      color: c[Math.floor(Math.random() * c.length)],
      size: 3 + Math.random() * 5,
      type: type === 'coin' ? 'coin' : type === 'sparkle' ? 'sparkle' : 'leaf',
    });
  }
}

export function spawnDamageNumber(state: GameState, x: number, y: number, value: number, color: string) {
  state.damageNumbers.push({
    id: `d${damageId++}`,
    x,
    y,
    value,
    color,
    life: 90,
    maxLife: 90,
    vy: -1.5,
  });
}

export function updateGame(state: GameState, dt: number): GameState {
  const newState = { ...state };
  newState.time += dt;
  newState.player = { ...state.player };

  handleMovement(newState, dt);
  updateCamera(newState);
  updateZoom(newState, dt);
  updateCrops(newState);
  updateVFX(newState);
  updateDamageNumbers(newState);
  updatePlayerAnim(newState, dt);
  updateNotification(newState, dt);

  return newState;
}

function handleMovement(state: GameState, dt: number) {
  const p = state.player;
  const speed = p.speed;
  let dx = 0, dy = 0;
  if (state.keys.has('w') || state.keys.has('arrowup')) { dy -= speed; p.facing = 'up'; }
  if (state.keys.has('s') || state.keys.has('arrowdown')) { dy += speed; p.facing = 'down'; }
  if (state.keys.has('a') || state.keys.has('arrowleft')) { dx -= speed; p.facing = 'left'; }
  if (state.keys.has('d') || state.keys.has('arrowright')) { dx += speed; p.facing = 'right'; }
  p.moving = dx !== 0 || dy !== 0;

  const mapW = getMapWidth(state.currentMap);
  const mapH = getMapHeight(state.currentMap);
  p.x = Math.max(20, Math.min(mapW - 20, p.x + dx));
  p.y = Math.max(20, Math.min(mapH - 20, p.y + dy));
}

export function getMapWidth(map: MapType): number {
  const sizes: Record<MapType, number> = { home: 1400, city: 1800, fishing: 1500, garden: 1600 };
  return sizes[map];
}
export function getMapHeight(map: MapType): number {
  const sizes: Record<MapType, number> = { home: 900, city: 700, fishing: 800, garden: 750 };
  return sizes[map];
}

function updateCamera(state: GameState) {
  const canvasW = 1280;
  const canvasH = 720;
  const targetCX = state.player.x * state.zoom - canvasW / 2;
  const targetCY = state.player.y * state.zoom - canvasH / 2;
  const mapW = getMapWidth(state.currentMap) * state.zoom;
  const mapH = getMapHeight(state.currentMap) * state.zoom;
  state.cameraX += (targetCX - state.cameraX) * 0.08;
  state.cameraY += (targetCY - state.cameraY) * 0.08;
  state.cameraX = Math.max(0, Math.min(mapW - canvasW, state.cameraX));
  state.cameraY = Math.max(0, Math.min(mapH - canvasH, state.cameraY));
}

function updateZoom(state: GameState, _dt: number) {
  state.zoom += (state.targetZoom - state.zoom) * 0.05;
}

function updateCrops(state: GameState) {
  const now = Date.now();
  state.farmPlots = state.farmPlots.map(plot => {
    if (!plot.crop) return plot;
    const elapsed = now - plot.crop.plantedAt;
    const growTime = CROP_GROW_TIMES[plot.crop.type] || 60000;
    const progress = Math.min(elapsed / growTime, 1);
    let stage: 0 | 1 | 2 | 3 = 0;
    if (progress >= 0.25) stage = 1;
    if (progress >= 0.6) stage = 2;
    if (progress >= 1.0) stage = 3;
    const ready = progress >= 1.0;
    return { ...plot, crop: { ...plot.crop, stage, ready } };
  });
}

function updateVFX(state: GameState) {
  state.vfxParticles = state.vfxParticles
    .map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.08,
      vx: p.vx * 0.97,
      life: p.life - 1,
      size: p.size * 0.98,
    }))
    .filter(p => p.life > 0);
}

function updateDamageNumbers(state: GameState) {
  state.damageNumbers = state.damageNumbers
    .map(d => ({ ...d, y: d.y + d.vy, life: d.life - 1 }))
    .filter(d => d.life > 0);
}

function updatePlayerAnim(state: GameState, dt: number) {
  state.playerAnimTimer += dt;
  if (state.playerAnimTimer >= 8) {
    state.playerAnimTimer = 0;
    if (state.player.moving) {
      state.playerAnimFrame = (state.playerAnimFrame + 1) % 4;
    } else {
      state.playerAnimFrame = 0;
    }
  }
}

function updateNotification(state: GameState, dt: number) {
  if (state.notification) {
    state.notification.life -= dt;
    if (state.notification.life <= 0) state.notification = null;
  }
}

export function handleToolAction(state: GameState): GameState {
  const newState = { ...state };
  newState.player = { ...state.player };
  newState.farmPlots = [...state.farmPlots];

  const px = newState.player.x;
  const py = newState.player.y;
  const tool = newState.player.tool;

  const nearestPlot = newState.farmPlots.reduce<{ plot: FarmPlot | null; dist: number }>(
    (acc, plot) => {
      const d = Math.hypot(plot.worldX + 32 - px, plot.worldY + 24 - py);
      return d < acc.dist ? { plot, dist: d } : acc;
    },
    { plot: null, dist: 120 }
  );

  if (nearestPlot.plot && nearestPlot.dist < 120) {
    const plotIdx = newState.farmPlots.findIndex(p => p.id === nearestPlot.plot!.id);
    const plot = { ...newState.farmPlots[plotIdx] };

    if (tool === 'water') {
      plot.watered = true;
      spawnVFX(newState, plot.worldX + 32, plot.worldY + 24, 'water');
      newState.notification = { text: '💧 Watered!', life: 90 };
      newState.farmPlots[plotIdx] = plot;
    } else if ((tool === 'seed' || tool === 'tomato') && !plot.crop) {
      const cropType = tool === 'tomato' ? 'tomato' : 'wheat';
      const invKey = tool === 'tomato' ? 'tomato-seed' : 'seeds';
      if ((newState.player.inventory[invKey] || 0) > 0) {
        const crop: Crop = {
          id: `crop-${Date.now()}-${Math.random()}`,
          x: plot.worldX + 32,
          y: plot.worldY + 24,
          type: cropType,
          plantedAt: Date.now(),
          growTime: CROP_GROW_TIMES[cropType],
          stage: 0,
          ready: false,
        };
        plot.crop = crop;
        newState.player.inventory = { ...newState.player.inventory };
        newState.player.inventory[invKey] = (newState.player.inventory[invKey] || 1) - 1;
        spawnVFX(newState, crop.x, crop.y, 'plant');
        newState.notification = { text: '🌱 Planted!', life: 90 };
        updateQuest(newState, 'plant');
        newState.farmPlots[plotIdx] = plot;
      } else {
        newState.notification = { text: '❌ No seeds!', life: 90 };
      }
    } else if (tool === 'celurit' || tool === 'shovel') {
      if (plot.crop && plot.crop.ready) {
        const cropType = plot.crop.type;
        const goldEarned = CROP_GOLD_REWARDS[cropType] || 5;
        newState.player.gold += goldEarned;
        newState.player.exp += 10;
        newState.player.inventory = { ...newState.player.inventory };
        newState.player.inventory[cropType] = (newState.player.inventory[cropType] || 0) + 1;
        spawnVFX(newState, plot.worldX + 32, plot.worldY + 24, 'harvest');
        spawnVFX(newState, plot.worldX + 32, plot.worldY + 24, 'coin');
        spawnDamageNumber(newState, plot.worldX + 32, plot.worldY - 10, goldEarned, '#FFD700');
        updateQuest(newState, 'harvest');
        updateQuest(newState, 'earn');
        plot.crop = null;
        plot.watered = false;
        newState.notification = { text: `🌾 +${goldEarned} GOLD!`, life: 90 };

        if (newState.player.exp >= newState.player.maxExp) {
          newState.player.level += 1;
          newState.player.exp -= newState.player.maxExp;
          newState.player.maxExp = Math.floor(newState.player.maxExp * 1.5);
          newState.player.maxHp += 5;
          newState.player.hp = Math.min(newState.player.hp + 5, newState.player.maxHp);
          spawnVFX(newState, px, py, 'sparkle');
          newState.notification = { text: `⭐ Level Up! ${newState.player.level}!`, life: 120 };
        }
        newState.farmPlots[plotIdx] = plot;
      } else if (plot.crop) {
        newState.notification = { text: '⏰ Not ready yet!', life: 90 };
      } else {
        plot.tilled = true;
        spawnVFX(newState, plot.worldX + 32, plot.worldY + 24, 'plant');
        newState.notification = { text: '🔨 Tilled!', life: 90 };
        newState.farmPlots[plotIdx] = plot;
      }
    } else if (tool === 'hoe') {
      plot.tilled = true;
      spawnVFX(newState, plot.worldX + 32, plot.worldY + 24, 'sparkle');
      newState.notification = { text: '⛏️ Tilled!', life: 90 };
      newState.farmPlots[plotIdx] = plot;
    } else if (tool === 'axe') {
      newState.player.gold += 3;
      spawnVFX(newState, px, py, 'coin');
      spawnDamageNumber(newState, px, py - 30, 3, '#90EE90');
      updateQuest(newState, 'chop');
      newState.notification = { text: '🪓 +3 GOLD!', life: 90 };
    }
  } else if (tool === 'axe') {
    newState.player.gold += 3;
    spawnVFX(newState, px, py - 20, 'coin');
    spawnDamageNumber(newState, px, py - 40, 3, '#90EE90');
    updateQuest(newState, 'chop');
    newState.notification = { text: '🪓 Chop! +3 GOLD!', life: 90 };
  }

  return newState;
}

function updateQuest(state: GameState, type: string) {
  state.quests = state.quests.map(q => {
    if (q.completed) return q;
    if (q.type === type) {
      const newCurrent = q.current + 1;
      const completed = newCurrent >= q.target;
      if (completed) {
        state.player.gold += q.reward;
        spawnDamageNumber(state, state.player.x, state.player.y - 50, q.reward, '#FFD700');
      }
      return { ...q, current: newCurrent, completed };
    }
    return q;
  });
}
