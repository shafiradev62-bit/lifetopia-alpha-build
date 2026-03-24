export const ASSET_PATHS = {
  chibi: '/chibi_1774349990714.png',
  celurit: '/celurit_1774349990712.png',
  kapak: '/kapak_1774349990716.png',
  kapak1: '/kapak_1_1774349990715.png',
  karung: '/karung_1774349990717.png',
  home: '/home_1774349990715.jpg',
  kota: '/kota_1774349990717.png',
  mapCity: '/map_city_1774350004456.png',
  mapFishing: '/map_fishing_1774350004455.png',
  mapGarden: '/map_garden_1774350004455.png',
};

export type MapType = 'home' | 'city' | 'fishing' | 'garden';

export interface Crop {
  id: string;
  x: number;
  y: number;
  type: 'wheat' | 'tomato' | 'carrot' | 'pumpkin';
  plantedAt: number;
  growTime: number;
  stage: 0 | 1 | 2 | 3;
  ready: boolean;
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
  type: 'sparkle' | 'leaf' | 'coin' | 'star' | 'smoke';
}

export interface DamageNumber {
  id: string;
  x: number;
  y: number;
  value: number;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
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
    tool: 'shovel' | 'seed' | 'tomato' | 'water' | 'axe' | 'hoe' | 'celurit';
    inventory: Record<string, number>;
  };
  currentMap: MapType;
  crops: Crop[];
  vfxParticles: VFXParticle[];
  damageNumbers: DamageNumber[];
  quests: Quest[];
  zoom: number;
  targetZoom: number;
  cameraX: number;
  cameraY: number;
  keys: Set<string>;
  farmPlots: FarmPlot[];
  time: number;
  shopOpen: boolean;
  inventoryOpen: boolean;
  questsOpen: boolean;
  notification: { text: string; life: number } | null;
  playerAnimFrame: number;
  playerAnimTimer: number;
}

export interface FarmPlot {
  id: string;
  gridX: number;
  gridY: number;
  worldX: number;
  worldY: number;
  tilled: boolean;
  watered: boolean;
  crop: Crop | null;
}

export const CROP_COLORS: Record<string, string[]> = {
  wheat: ['#F5DEB3', '#DAA520', '#B8860B'],
  tomato: ['#90EE90', '#FF6347', '#CC2200'],
  carrot: ['#90EE90', '#FF8C00', '#CC5500'],
  pumpkin: ['#90EE90', '#FF8C00', '#FF4500'],
};

export const CROP_GROW_TIMES: Record<string, number> = {
  wheat: 60000,
  tomato: 45000,
  carrot: 30000,
  pumpkin: 90000,
};

export const CROP_GOLD_REWARDS: Record<string, number> = {
  wheat: 5,
  tomato: 8,
  carrot: 6,
  pumpkin: 12,
};

export const CROP_EMOJIS: Record<string, string> = {
  wheat: '🌾',
  tomato: '🍅',
  carrot: '🥕',
  pumpkin: '🎃',
};
