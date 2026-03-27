export const ASSET_PATHS = {
  chibi: "/chibi_1774349990714.png",
  celurit: "/celurit_1774349990712.png",
  kapak: "/kapak_1774349990716.png",
  kapak1: "/kapak_1_1774349990715.png",
  karung: "/karung_1774349990717.png",
  home: "/home_1774349990715.jpg",
  kota: "/kota_1774349990717.png",
  mapCity: "/map_city_new.png",
  mapFishing: "/map_fishing_new.png",
  mapGarden: "/map_garden_new.png",
  mapSuburban: "/map_suburban_1774358176142.png",
  teko: "/teko_siram.png",
};

export type MapType = "home" | "city" | "fishing" | "garden" | "suburban";
export type ToolType =
  | "shovel"
  | "seed"
  | "tomato"
  | "water"
  | "axe"
  | "axe-large"
  | "hoe"
  | "sickle"
  | "play"
  | "fertilizer"
  | "wheat-seed"
  | "tomato-seed"
  | "carrot-seed"
  | "pumpkin-seed";

export type FarmBalancePreset = "casual" | "normal" | "hard";
export type CropType = "wheat" | "tomato" | "carrot" | "pumpkin";
export type CropTimingMap = Record<CropType | "corn", number>;

export interface Tree {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  type: "oak" | "pine" | "rock";
}

export interface Crop {
  id: string;
  type: CropType;
  plantedAt: number;
  growTime: number;
  stage: 0 | 1 | 2 | 3 | 4;
  ready: boolean;
}

export interface FarmPlot {
  id: string;
  gridX: number;
  gridY: number;
  worldX: number;
  worldY: number;
  tilled: boolean;
  watered: boolean;
  fertilized: boolean;
  crop: Crop | null;
}

export interface VFXParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: "leaf" | "coin" | "sparkle" | "bubble" | "drop" | "dust";
}

export interface DamageNumber {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: "harvest" | "plant" | "earn" | "chop" | "fish";
  target: number;
  current: number;
  reward: number;
  completed: boolean;
}

export interface NPC {
  id: string;
  x: number;
  y: number;
  name: string;
  color: string;
  vx: number;
  vy: number;
  moveTimer: number;
}

export interface FishBobber {
  active: boolean;
  x: number;
  y: number;
  bobTimer: number;
  biting: boolean;
  biteTimer: number;
}

export interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  type: "seed" | "tool" | "consumable";
}

export interface CollisionRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Footprint {
  x: number;
  y: number;
  facing: "left" | "right" | "up" | "down";
  life: number;
  maxLife: number;
  foot: "left" | "right";
}

export interface GameState {
  player: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    level: number;
    exp: number;
    maxExp: number;
    gold: number;
    facing: "left" | "right" | "up" | "down";
    moving: boolean;
    speed: number;
    tool: ToolType | null;
    inventory: Record<string, number>;
    animFrame: number;
    animTimer: number;
    running: boolean;
    action: ToolType | null;
    actionTimer: number;
    targetX: number | null;
    targetY: number | null;
    tutorialStep: number;
    lifetopiaGold: number;
    walletAddress: string;
    jumpY: number; // For professional jump/flip mechanics
    jumpFlip: number;
    jumpCount: number;
  };
  currentMap: MapType;
  farmPlots: FarmPlot[];
  vfxParticles: VFXParticle[];
  damageNumbers: DamageNumber[];
  quests: Quest[];
  npcs: NPC[];
  fishBobber: FishBobber;
  zoom: number;
  targetZoom: number;
  cameraX: number;
  cameraY: number;
  keys: Set<string>;
  time: number;
  notification: { text: string; life: number } | null;
  bubbleText: string;
  shopOpen: boolean;
  shopItems: ShopItem[];
  fishingActive: boolean;
  activePanel: string | null;
  particleId: number;
  damageId: number;
  trees: Tree[];
  footprints: Footprint[];
  hoveredPlotId: string | null;
  harvestLocked: boolean;
  pendingPlotAction: { plotId: string; tool: string } | null;
  demoMode: boolean;
  demoTimer: number;
  tutorialActive: boolean;
  showFarmDebugOverlay: boolean;
  farmBalancePreset: FarmBalancePreset;
}

export const FARM_BALANCE_PRESETS: Record<
  FarmBalancePreset,
  { growTimes: CropTimingMap; goldRewards: CropTimingMap }
> = {
  casual: {
    growTimes: {
      wheat: 9000,
      tomato: 13000,
      carrot: 7000,
      pumpkin: 19000,
      corn: 10000,
    },
    goldRewards: {
      wheat: 7,
      tomato: 14,
      carrot: 8,
      pumpkin: 21,
      corn: 12,
    },
  },
  normal: {
    growTimes: {
      wheat: 12000,
      tomato: 18000,
      carrot: 10000,
      pumpkin: 26000,
      corn: 14000,
    },
    goldRewards: {
      wheat: 6,
      tomato: 12,
      carrot: 7,
      pumpkin: 18,
      corn: 10,
    },
  },
  hard: {
    growTimes: {
      wheat: 16000,
      tomato: 24000,
      carrot: 13000,
      pumpkin: 34000,
      corn: 19000,
    },
    goldRewards: {
      wheat: 5,
      tomato: 10,
      carrot: 6,
      pumpkin: 15,
      corn: 8,
    },
  },
};

export const CROP_GROW_TIMES: CropTimingMap =
  FARM_BALANCE_PRESETS.normal.growTimes;

export const CROP_GOLD_REWARDS: CropTimingMap =
  FARM_BALANCE_PRESETS.normal.goldRewards;

export function applyFarmBalancePreset(
  preset: FarmBalancePreset,
  options?: { overwriteGlobals?: boolean },
): { growTimes: CropTimingMap; goldRewards: CropTimingMap } {
  const selected = FARM_BALANCE_PRESETS[preset];
  const growTimes = { ...selected.growTimes };
  const goldRewards = { ...selected.goldRewards };

  if (options?.overwriteGlobals !== false) {
    Object.assign(CROP_GROW_TIMES, growTimes);
    Object.assign(CROP_GOLD_REWARDS, goldRewards);
  }

  return { growTimes, goldRewards };
}

export function getFarmBalancePreset(
  growTimes: Partial<CropTimingMap>,
): FarmBalancePreset {
  const entries = Object.entries(FARM_BALANCE_PRESETS) as Array<
    [FarmBalancePreset, { growTimes: CropTimingMap }]
  >;

  for (const [name, preset] of entries) {
    const same =
      preset.growTimes.wheat === growTimes.wheat &&
      preset.growTimes.tomato === growTimes.tomato &&
      preset.growTimes.carrot === growTimes.carrot &&
      preset.growTimes.pumpkin === growTimes.pumpkin;
    if (same) return name;
  }

  return "normal";
}

export const CROP_STAGES_COLORS: Record<string, string[]> = {
  wheat: ["#C8B058", "#DAA520", "#FFD700"],
  tomato: ["#90EE90", "#FF6347", "#FF2200"],
  carrot: ["#90EE90", "#FF8C00", "#FF6600"],
  pumpkin: ["#90EE90", "#FF8C00", "#FF4500"],
};

export const MAP_SIZES: Record<MapType, { w: number; h: number }> = {
  home: { w: 1040, h: 585 },
  city: { w: 1040, h: 585 },
  fishing: { w: 1040, h: 585 },
  garden: { w: 1040, h: 585 },
  suburban: { w: 1040, h: 585 },
};

export const MAP_PLAYER_START: Record<MapType, { x: number; y: number }> = {
  home: { x: 488, y: 290 }, // Center of farm soil area
  city: { x: 520, y: 520 },
  fishing: { x: 280, y: 490 },
  garden: { x: 520, y: 460 },
  suburban: { x: 520, y: 460 },
};

export const GARDEN_ROAD_Y = { min: 420, max: 520 };

export const MAP_COLLISIONS: Record<MapType, CollisionRect[]> = {
  home: [
    // Map boundaries
    { x: 0, y: 0, w: 1040, h: 30 },
    { x: 0, y: 0, w: 30, h: 585 },
    { x: 1010, y: 0, w: 30, h: 585 },
    { x: 0, y: 560, w: 1040, h: 25 },
    // House/building collisions - block player from walking through
    // House/building collisions - top area only
    { x: 480, y: 0, w: 560, h: 145 },
    // Side boundaries
    { x: 0, y: 0, w: 30, h: 585 },
    { x: 1010, y: 0, w: 30, h: 585 },
  ],
  city: [
    // Map boundaries
    { x: 0, y: 0, w: 1040, h: 30 },
    { x: 0, y: 0, w: 30, h: 585 },
    { x: 1010, y: 0, w: 30, h: 585 },
    { x: 0, y: 560, w: 1040, h: 25 },
    // Shop buildings - top area
    { x: 0, y: 0, w: 1040, h: 100 },
    // Shop zones collision
    { x: 0, y: 430, w: 1040, h: 40 },
  ],
  fishing: [
    // Map boundaries
    { x: 0, y: 0, w: 1040, h: 30 },
    { x: 0, y: 0, w: 30, h: 585 },
    { x: 1010, y: 0, w: 30, h: 585 },
    { x: 0, y: 560, w: 1040, h: 25 },
    // Water/fishing area - block northern part
    { x: 100, y: 0, w: 840, h: 240 },
    // Obstacles
    { x: 90, y: 390, w: 300, h: 120 },
  ],
  garden: [
    // Map boundaries
    { x: 0, y: 0, w: 1040, h: 30 },
    { x: 0, y: 0, w: 30, h: 585 },
    { x: 1010, y: 0, w: 30, h: 585 },
    { x: 0, y: 560, w: 1040, h: 25 },
    // Top blocked area
    { x: 0, y: 0, w: 1040, h: 175 },
    // Social area boundary
    { x: 0, y: 380, w: 1040, h: 40 },
  ],
  suburban: [
    // Map boundaries
    { x: 0, y: 0, w: 1040, h: 30 },
    { x: 0, y: 0, w: 30, h: 585 },
    { x: 1010, y: 0, w: 30, h: 585 },
    { x: 0, y: 560, w: 1040, h: 25 },
  ],
};

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "wheat-seed",
    name: "Wheat Seeds",
    emoji: "🌾",
    price: 5,
    type: "seed",
  },
  {
    id: "tomato-seed",
    name: "Tomato Seeds",
    emoji: "🍅",
    price: 8,
    type: "seed",
  },
  {
    id: "carrot-seed",
    name: "Carrot Seeds",
    emoji: "🥕",
    price: 6,
    type: "seed",
  },
  {
    id: "pumpkin-seed",
    name: "Pumpkin Seeds",
    emoji: "🎃",
    price: 10,
    type: "seed",
  },
  {
    id: "fish-bait",
    name: "Fish Bait",
    emoji: "🪱",
    price: 3,
    type: "consumable",
  },
  {
    id: "fertilizer",
    name: "Fertilizer",
    emoji: "💊",
    price: 12,
    type: "consumable",
  },
];

export const FARM_GRID = {
  cols: 3,
  rows: 2,
  cellW: 83,
  cellH: 68,
  startX: 197,
  startY: 259,
};
