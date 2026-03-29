export const ASSET_PATHS = {
  chibi: "/chibi_1774349990714.png",
  celurit: "/celurit_1774349990712.png",
  kapak: "/kapak_1774349990716.png",
  kapak1: "/kapak_1_1774349990715.png",
  karung: "/karung_1774349990717.png",
  home: "/home_1774349990715.jpg",
  kota: "/kota_1774349990717.png",
  mapCity: "/map_city_new.png",
  mapFishing: "/map_fishing_v2.png",
  mapGarden: "/map_garden_new.png",
  mapSuburban: "/map_suburban_v2.png",
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
  | "work"
  | "fish"
  | "fertilizer"
  | "wheat-seed"
  | "tomato-seed"
  | "carrot-seed"
  | "pumpkin-seed";

/** Game difficulty: affects grow duration & sell value multipliers */
export type FarmBalancePreset = "easy" | "medium" | "hard";
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
  isRare?: boolean;
  /** Failed / withered — can be cleared with axe */
  dead?: boolean;
}

export type VFXType = "dust" | "plant" | "harvest" | "coin" | "sparkle" | "flash" | "slash" | "drop" | "water" | "leaf" | "bubble";

export interface FarmPlot {
  id: string;
  /** Stable UUID for Supabase `plot_id` / sync */
  plotUuid: string;
  gridX: number;
  gridY: number;
  worldX: number;
  worldY: number;
  tilled: boolean;
  watered: boolean;
  fertilized: boolean;
  crop: Crop | null;
  /** Game time when drought stress began (crop exists, not watered) */
  stressDrySince: number | null;
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
  type: VFXType;
}

export interface DamageNumber {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy?: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: "harvest" | "plant" | "earn" | "chop" | "fish";
  target: number;
  current: number;
  reward: number;
  /** Objective reached — reward not yet claimed */
  completed: boolean;
  /** Reward taken (prevents spam); paired with localStorage / gold sync */
  claimed: boolean;
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

export interface FishingCatchHold {
  until: number;
  tier: 0 | 1 | 2;
  gold: number;
}

export interface GardenCritter {
  id: string;
  kind: "butterfly" | "bird";
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
}

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  type: "seed" | "tool" | "cosmetic";
  emoji: string;
  spriteUrl: string;
}

export interface CollisionRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Locked house zones — suburban NFT teaser */
export const SUBURBAN_HOUSE_ZONES: CollisionRect[] = [
  { x: 200, y: 180, w: 140, h: 120 },
  { x: 700, y: 160, w: 160, h: 130 },
  { x: 480, y: 320, w: 120, h: 100 },
];

export interface GardenRemotePlayer {
  id: string;
  x: number;
  y: number;
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
    harvestCount: number; // Added to track 1st harvest unlock
    lifetopiaGold: number;
    walletAddress: string;
    jumpY: number; // For professional jump/flip mechanics
    jumpFlip: number;
    jumpCount: number;
    emote: "wave" | "dance" | "sit" | "laugh" | null;
    emoteUntil: number;
    emoteBubble: string | null;
    emoteBubbleUntil: number;
    nftEligibility: boolean;
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
  seedCooldowns: Record<string, number>;
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
  shake: number;
  /** Canvas pixels (match mouse on 1280×720 buffer) */
  pointerCanvas: { x: number; y: number } | null;
  /** Plot under cursor on farm (for hover outline) */
  plotHoverFromPointer: string | null;
  /** Squash/stretch juice on plot */
  plotJuice: { plotId: string; until: number } | null;
  farmingSpeedMultiplier: number;
  nftBoostActive: boolean;
  fishingCatchHold: FishingCatchHold | null;
  fishingRareFlash: string | null;
  gardenCritters: GardenCritter[];
  gardenActivePlayers: number;
  marketTrendCrop: CropType | null;
  marketTrendUntil: number;
  levelUpPopup: { message: string; until: number } | null;
  pendingCloudSave: boolean;
  /** Atomic plot interaction state machine */
  farmingEngine:
    | { kind: "idle" }
    | {
        kind: "busy";
        plotId: string;
        plotUuid: string;
        toolKey: string;
      };
  gardenRemotePlayers: GardenRemotePlayer[];
  fishingSession: {
    state: "casting" | "waiting" | "bite" | "struggle" | "success" | "failed";
    timer: number;
    bobberX: number;
    bobberY: number;
    struggleProgress: number;
    rarity?: "common" | "rare" | "exotic";
  } | null;
}


/** GDD base grow times (ms) before difficulty multiplier */
export const CROP_BASE_GROW_MS: Record<CropType, number> = {
  wheat: 120000,
  tomato: 240000,
  carrot: 360000,
  pumpkin: 480000,
};

/** Base sell gold before difficulty multiplier */
export const CROP_BASE_SELL_GOLD: Record<CropType, number> = {
  wheat: 5,
  tomato: 10,
  carrot: 15,
  pumpkin: 25,
};

export const CROP_HARVEST_XP: Record<CropType, number> = {
  wheat: 10,
  tomato: 20,
  carrot: 35,
  pumpkin: 55,
};

export const FARM_BALANCE_PRESETS: Record<
  FarmBalancePreset,
  {
    growTimeMultiplier: number;
    goldRewardMultiplier: number;
    expMultiplier: number;
    playerSpeedBonus: number;
    rareChance: number;
    seedPriceExtra: Partial<Record<string, number>>;
  }
> = {
  easy: {
    growTimeMultiplier: 1.0,
    goldRewardMultiplier: 1.0,
    expMultiplier: 1.0,
    playerSpeedBonus: 0,
    rareChance: 0.08,
    seedPriceExtra: {},
  },
  medium: {
    growTimeMultiplier: 1.5,
    goldRewardMultiplier: 2.0,
    expMultiplier: 1.15,
    playerSpeedBonus: 0,
    rareChance: 0.12,
    seedPriceExtra: { "carrot-seed": 1.35, "pumpkin-seed": 1.55 },
  },
  hard: {
    growTimeMultiplier: 2.0,
    goldRewardMultiplier: 5.0,
    expMultiplier: 1.35,
    playerSpeedBonus: 0,
    rareChance: 0.18,
    seedPriceExtra: { "carrot-seed": 1.7, "pumpkin-seed": 2.1 },
  },
};

export const CROP_GROW_TIMES: CropTimingMap = {
  wheat: CROP_BASE_GROW_MS.wheat,
  tomato: CROP_BASE_GROW_MS.tomato,
  carrot: CROP_BASE_GROW_MS.carrot,
  pumpkin: CROP_BASE_GROW_MS.pumpkin,
  corn: 140000,
};

export const CROP_GOLD_REWARDS: CropTimingMap = {
  wheat: CROP_BASE_SELL_GOLD.wheat,
  tomato: CROP_BASE_SELL_GOLD.tomato,
  carrot: CROP_BASE_SELL_GOLD.carrot,
  pumpkin: CROP_BASE_SELL_GOLD.pumpkin,
  corn: 12,
};

export function applyFarmBalancePreset(
  preset: FarmBalancePreset,
  options?: { overwriteGlobals?: boolean },
): { growTimes: CropTimingMap; goldRewards: CropTimingMap; expMultiplier: number; speedBonus: number } {
  const sel = FARM_BALANCE_PRESETS[preset];
  const growTimes: CropTimingMap = {
    wheat: Math.round(CROP_BASE_GROW_MS.wheat * sel.growTimeMultiplier),
    tomato: Math.round(CROP_BASE_GROW_MS.tomato * sel.growTimeMultiplier),
    carrot: Math.round(CROP_BASE_GROW_MS.carrot * sel.growTimeMultiplier),
    pumpkin: Math.round(CROP_BASE_GROW_MS.pumpkin * sel.growTimeMultiplier),
    corn: Math.round(140000 * sel.growTimeMultiplier),
  };
  const goldRewards: CropTimingMap = {
    wheat: Math.round(CROP_BASE_SELL_GOLD.wheat * sel.goldRewardMultiplier),
    tomato: Math.round(CROP_BASE_SELL_GOLD.tomato * sel.goldRewardMultiplier),
    carrot: Math.round(CROP_BASE_SELL_GOLD.carrot * sel.goldRewardMultiplier),
    pumpkin: Math.round(CROP_BASE_SELL_GOLD.pumpkin * sel.goldRewardMultiplier),
    corn: Math.round(12 * sel.goldRewardMultiplier),
  };

  if (options?.overwriteGlobals !== false) {
    Object.assign(CROP_GROW_TIMES, growTimes);
    Object.assign(CROP_GOLD_REWARDS, goldRewards);
  }

  return {
    growTimes,
    goldRewards,
    expMultiplier: sel.expMultiplier,
    speedBonus: sel.playerSpeedBonus,
  };
}

export function getFarmBalancePreset(
  growTimes: Partial<CropTimingMap>,
): FarmBalancePreset {
  for (const name of ["easy", "medium", "hard"] as FarmBalancePreset[]) {
    applyFarmBalancePreset(name, { overwriteGlobals: false });
    const probe = FARM_BALANCE_PRESETS[name];
    const g = {
      wheat: Math.round(CROP_BASE_GROW_MS.wheat * probe.growTimeMultiplier),
      tomato: Math.round(CROP_BASE_GROW_MS.tomato * probe.growTimeMultiplier),
      carrot: Math.round(CROP_BASE_GROW_MS.carrot * probe.growTimeMultiplier),
      pumpkin: Math.round(CROP_BASE_GROW_MS.pumpkin * probe.growTimeMultiplier),
    };
    const same =
      g.wheat === growTimes.wheat &&
      g.tomato === growTimes.tomato &&
      g.carrot === growTimes.carrot &&
      g.pumpkin === growTimes.pumpkin;
    if (same) return name;
  }
  return "medium";
}

/**
 * Crop gates (all difficulties): Wheat 1, Tomato 2+, Carrot 3+, Pumpkin 5+.
 * `difficulty` retained for API compatibility; multipliers still from preset.
 */
export function seedUnlockLevel(
  crop: CropType,
  _difficulty: FarmBalancePreset,
): number {
  if (crop === "wheat") return 1;
  if (crop === "tomato") return 1;
  if (crop === "carrot") return 3;
  if (crop === "pumpkin") return 5;
  return 1;
}

/** Medium/Hard drought stress — ms without water before wither */
export function stressWiltThresholdMs(preset: FarmBalancePreset): number {
  if (preset === "easy") return 20000;
  if (preset === "medium") return 7500;
  return 5000;
}

export function isCropPlantingUnlocked(
  crop: CropType,
  playerLevel: number,
  difficulty: FarmBalancePreset,
): boolean {
  return playerLevel >= seedUnlockLevel(crop, difficulty);
}

export function toolIdToCrop(tool: string): CropType | null {
  if (tool.includes("wheat")) return "wheat";
  if (tool.includes("tomato")) return "tomato";
  if (tool.includes("carrot")) return "carrot";
  if (tool.includes("pumpkin")) return "pumpkin";
  return null;
}

export function getShopSeedPrice(
  itemId: string,
  basePrice: number,
  difficulty: FarmBalancePreset,
): number {
  const extra = FARM_BALANCE_PRESETS[difficulty].seedPriceExtra[itemId] ?? 1;
  return Math.ceil(basePrice * extra);
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
  suburban: { x: 120, y: 480 },
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
    // Water/fishing area - block top edge only
    { x: 0, y: 0, w: 1040, h: 140 },
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
    // Only walk on the road/path — block residential top and yard bottom
    { x: 0, y: 0, w: 1040, h: 420 }, // Block top residential zone
    { x: 0, y: 520, w: 1040, h: 70 }, // Block bottom yard zone
  ],
};

export const SHOP_ITEMS: ShopItem[] = [
  { id: "wheat-seed", name: "Wheat Seed", price: 2, type: "seed", emoji: "🌾", spriteUrl: "/wheat.png" },
  { id: "tomato-seed", name: "Tomato Seed", price: 5, type: "seed", emoji: "🍅", spriteUrl: "/tomato.png" },
  { id: "carrot-seed", name: "Carrot Seed", price: 8, type: "seed", emoji: "🥕", spriteUrl: "/carrot.png" },
  { id: "pumpkin-seed", name: "Pumpkin Seed", price: 12, type: "seed", emoji: "🎃", spriteUrl: "/pumpkin.png" },
  { id: "water", name: "Watering Can", price: 15, type: "tool", emoji: "💧", spriteUrl: "/teko_siram.png" },
  { id: "fertilizer", name: "Super Growth", price: 10, type: "tool", emoji: "✨", spriteUrl: "/karung_1774349990717.png" },
  { id: "axe", name: "Wood Axe", price: 25, type: "tool", emoji: "🪓", spriteUrl: "/kapak_1774349990716.png" },
  { id: "hoe", name: "Steel Hoe", price: 30, type: "tool", emoji: "⛏️", spriteUrl: "/celurit_1774349990712.png" },
];

export const FARM_GRID = {
  cols: 3,
  rows: 2,
  cellW: 83,
  cellH: 68,
  startX: 197,
  startY: 259,
};

export function farmPlotIsActionable(
  plot: FarmPlot,
  tool: string | null,
): boolean {
  if (!tool) return false;

  // Axe: Clear crops (dead or alive) OR untill/reset the soil
  if (tool === "axe" || tool === "axe-large") {
    return plot.tilled || !!plot.crop;
  }

  // Soil tools (Hoe, Sickle, Shovel): Till the earth OR harvest ready crops
  const isSoil = tool === "hoe" || tool === "shovel" || tool === "sickle" || tool === "sickle-gold";
  if (isSoil) {
    if (!plot.tilled) return true; // Can till
    if (plot.crop?.ready) return true; // Can harvest
    return false;
  }

  // Water: Any tilled plot, with or without crop, as long as it's dry
  if (tool === "water") {
    return plot.tilled && !plot.watered;
  }

  // Fertilizer: Any tilled plot that hasn't been boosted yet
  if (tool === "fertilizer") {
    return plot.tilled && !plot.fertilized;
  }

  // Seeds: Only on tilled, empty soil
  if (tool.endsWith("-seed")) {
    return plot.tilled && !plot.crop;
  }

  return false;
}
