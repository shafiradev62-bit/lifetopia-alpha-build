export const ASSET_PATHS = {
  chibi: '/chibi_1774349990714.png',
  celurit: '/celurit_1774349990712.png',
  kapak: '/kapak_1774349990716.png',
  kapak1: '/kapak_1_1774349990715.png',
  karung: '/karung_1774349990717.png',
  home: '/home_1774349990715.jpg',
  kota: '/kota_1774349990717.png',
  mapCity: '/map_city_new.png',
  mapFishing: '/map_fishing_new.png',
  mapGarden: '/map_garden_new.png',
  mapSuburban: '/map_suburban_1774358176142.png',
  teko: '/teko_siram.png',
};

export type MapType = 'home' | 'city' | 'fishing' | 'garden' | 'suburban';
export type ToolType = 'shovel' | 'seed' | 'tomato' | 'water' | 'axe' | 'hoe' | 'sickle' | 'play' | 'fertilizer' | 'wheat-seed' | 'tomato-seed' | 'carrot-seed' | 'pumpkin-seed';

export interface Tree {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  type: 'oak' | 'pine';
}

export interface Crop {
  id: string;
  type: 'wheat' | 'tomato' | 'carrot' | 'pumpkin';
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
  type: 'leaf' | 'coin' | 'sparkle' | 'bubble' | 'drop' | 'dust';
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
  type: 'harvest' | 'plant' | 'earn' | 'chop' | 'fish';
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
  type: 'seed' | 'tool' | 'consumable';
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
  facing: 'left' | 'right' | 'up' | 'down';
  life: number;
  maxLife: number;
  foot: 'left' | 'right';
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
    facing: 'left' | 'right' | 'up' | 'down';
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
  mousePos: { x: number; y: number };
  mouseHoveredPlotId: string | null;
}

export const CROP_DATA = {
  wheat: { growTime: 120, goldReward: 5, xpReward: 2 },
  tomato: { growTime: 300, goldReward: 12, xpReward: 5 },
  pumpkin: { growTime: 600, goldReward: 25, xpReward: 10 },
  carrot: { growTime: 180, goldReward: 8, xpReward: 4 }, // Added carrot
  corn: { growTime: 240, goldReward: 10, xpReward: 4 }, // Added corn for compatibility
};

export const CROP_GROW_TIMES: Record<string, number> = Object.fromEntries(
  Object.entries(CROP_DATA).map(([k, v]) => [k, v.growTime * 1000])
);

export const CROP_GOLD_REWARDS: Record<string, number> = Object.fromEntries(
  Object.entries(CROP_DATA).map(([k, v]) => [k, v.goldReward])
);

export const CROP_XP_REWARDS: Record<string, number> = Object.fromEntries(
  Object.entries(CROP_DATA).map(([k, v]) => [k, v.xpReward])
);

export const CROP_STAGES_COLORS: Record<string, string[]> = {
  wheat:   ['#C8B058', '#DAA520', '#FFD700'],
  tomato:  ['#90EE90', '#FF6347', '#FF2200'],
  carrot:  ['#90EE90', '#FF8C00', '#FF6600'],
  pumpkin: ['#90EE90', '#FF8C00', '#FF4500'],
};

export const MAP_SIZES: Record<MapType, { w: number; h: number }> = {
  home:    { w: 1040, h: 585 },
  city:    { w: 1040, h: 585 },
  fishing: { w: 1040, h: 585 },
  garden:  { w: 1040, h: 585 },
  suburban:{ w: 1040, h: 585 },
};

export const MAP_PLAYER_START: Record<MapType, { x: number; y: number }> = {
  home:    { x: 488, y: 290 }, // Center of farm soil area
  city:    { x: 520, y: 520 },
  fishing: { x: 280, y: 490 },
  garden:  { x: 520, y: 460 },
  suburban:{ x: 520, y: 460 },
};

export const GARDEN_ROAD_Y = { min: 420, max: 520 };

export const MAP_COLLISIONS: Record<MapType, CollisionRect[]> = {
  home: [
    // Map boundaries
    { x: 0,   y: 0,   w: 1040, h: 30  },
    { x: 0,   y: 0,   w: 30,   h: 585 },
    { x: 1010,y: 0,   w: 30,   h: 585 },
    { x: 0,   y: 560, w: 1040, h: 25  },
    // House/building collisions - block player from walking through
    // House/building collisions - top area only
    { x: 480, y: 0,   w: 560,  h: 145 },
    // Side boundaries
    { x: 0,   y: 0,   w: 30,   h: 585 },
    { x: 1010,y: 0,   w: 30,   h: 585 },
  ],
  city: [
    // Map boundaries
    { x: 0,   y: 0,   w: 1040, h: 30  },
    { x: 0,   y: 0,   w: 30,   h: 585 },
    { x: 1010,y: 0,   w: 30,   h: 585 },
    { x: 0,   y: 560, w: 1040, h: 25  },
    // Shop buildings - top area
    { x: 0,   y: 0,   w: 1040, h: 100 },
    // Shop zones collision
    { x: 0,   y: 430, w: 1040, h: 40  },
  ],
  fishing: [
    // Map boundaries
    { x: 0,   y: 0,   w: 1040, h: 30  },
    { x: 0,   y: 0,   w: 30,   h: 585 },
    { x: 1010,y: 0,   w: 30,   h: 585 },
    { x: 0,   y: 560, w: 1040, h: 25  },
    // Water/fishing area - block northern part
    { x: 100, y: 0,   w: 840,  h: 240 },
    // Obstacles
    { x: 90,  y: 390, w: 300,  h: 120 },
  ],
  garden: [
    // Map boundaries
    { x: 0,   y: 0,   w: 1040, h: 30  },
    { x: 0,   y: 0,   w: 30,   h: 585 },
    { x: 1010,y: 0,   w: 30,   h: 585 },
    { x: 0,   y: 560, w: 1040, h: 25  },
    // Top blocked area
    { x: 0,   y: 0,   w: 1040, h: 175 },
    // Social area boundary
    { x: 0,   y: 380, w: 1040, h: 40  },
  ],
  suburban: [
    // Map boundaries
    { x: 0,   y: 0,   w: 1040, h: 30  },
    { x: 0,   y: 0,   w: 30,   h: 585 },
    { x: 1010,y: 0,   w: 30,   h: 585 },
    { x: 0,   y: 560, w: 1040, h: 25  },
  ],
};

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'wheat-seed', name: 'Wheat Seeds', emoji: '🌾', price: 5, type: 'seed' },
  { id: 'tomato-seed', name: 'Tomato Seeds', emoji: '🍅', price: 8, type: 'seed' },
  { id: 'carrot-seed', name: 'Carrot Seeds', emoji: '🥕', price: 6, type: 'seed' },
  { id: 'pumpkin-seed', name: 'Pumpkin Seeds', emoji: '🎃', price: 10, type: 'seed' },
  { id: 'fish-bait', name: 'Fish Bait', emoji: '🪱', price: 3, type: 'consumable' },
  { id: 'fertilizer', name: 'Fertilizer', emoji: '💊', price: 12, type: 'consumable' },
];

export const FARM_GRID = {
  cols: 3,
  rows: 2,
  cellW: 80,
  cellH: 65,
  startX: 315,
  startY: 170,
};
