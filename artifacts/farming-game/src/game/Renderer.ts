import { GameState, CROP_COLORS, MapType } from './Game';
import { getMapWidth, getMapHeight } from './GameEngine';

const images: Record<string, HTMLImageElement> = {};

export function loadImage(src: string): Promise<HTMLImageElement> {
  if (images[src]) return Promise.resolve(images[src]);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { images[src] = img; resolve(img); };
    img.onerror = reject;
    img.src = src;
  });
}

export function preloadAssets() {
  const assets = [
    '/chibi_1774349990714.png',
    '/home_1774349990715.jpg',
    '/kota_1774349990717.png',
    '/map_city_1774350004456.png',
    '/map_fishing_1774350004455.png',
    '/map_garden_1774350004455.png',
    '/celurit_1774349990712.png',
    '/kapak_1774349990716.png',
    '/kapak_1_1774349990715.png',
    '/karung_1774349990717.png',
  ];
  return Promise.all(assets.map(loadImage));
}

function getMapImage(map: MapType): HTMLImageElement | null {
  const paths: Record<MapType, string> = {
    home: '/home_1774349990715.jpg',
    city: '/map_city_1774350004456.png',
    fishing: '/map_fishing_1774350004455.png',
    garden: '/map_garden_1774350004455.png',
  };
  return images[paths[map]] || null;
}

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState, width: number, height: number) {
  const { zoom, cameraX, cameraY } = state;

  ctx.save();
  ctx.translate(-cameraX, -cameraY);
  ctx.scale(zoom, zoom);

  drawBackground(ctx, state);
  drawFarmPlots(ctx, state);
  drawCrops(ctx, state);
  drawPlayer(ctx, state);
  drawVFX(ctx, state);
  drawDamageNumbers(ctx, state);

  ctx.restore();

  drawMinimap(ctx, state, width, height);
}

function drawBackground(ctx: CanvasRenderingContext2D, state: GameState) {
  const mapImg = getMapImage(state.currentMap);
  const mapW = getMapWidth(state.currentMap);
  const mapH = getMapHeight(state.currentMap);

  if (mapImg) {
    ctx.drawImage(mapImg, 0, 0, mapW, mapH);
  } else {
    const grass = ctx.createLinearGradient(0, 0, mapW, mapH);
    grass.addColorStop(0, '#4a7c59');
    grass.addColorStop(0.5, '#5a8a68');
    grass.addColorStop(1, '#3d6b4a');
    ctx.fillStyle = grass;
    ctx.fillRect(0, 0, mapW, mapH);
  }

  if (state.currentMap === 'home') {
    drawHomeFarmOverlay(ctx, state);
  }
}

function drawHomeFarmOverlay(ctx: CanvasRenderingContext2D, state: GameState) {
  const px = state.player.x;
  const py = state.player.y;
  const dist = Math.hypot(px - 820, py - 400);
  if (dist < 60) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(820, 400, 55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawFarmPlots(ctx: CanvasRenderingContext2D, state: GameState) {
  if (state.currentMap !== 'home') return;

  for (const plot of state.farmPlots) {
    ctx.save();
    const isNear = Math.hypot(plot.worldX + 32 - state.player.x, plot.worldY + 24 - state.player.y) < 90;

    if (plot.watered) {
      ctx.fillStyle = '#5C4033';
    } else if (plot.tilled) {
      ctx.fillStyle = '#7B5E3D';
    } else {
      ctx.fillStyle = '#6B4E3D';
    }
    ctx.fillRect(plot.worldX, plot.worldY, 60, 44);
    ctx.strokeStyle = isNear ? '#FFD700' : '#5C4033';
    ctx.lineWidth = isNear ? 2 : 1;
    ctx.strokeRect(plot.worldX, plot.worldY, 60, 44);

    if (plot.watered) {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#1E90FF';
      ctx.fillRect(plot.worldX, plot.worldY, 60, 44);
      ctx.globalAlpha = 1;
    }

    if (isNear && !plot.crop) {
      ctx.fillStyle = 'rgba(255,215,0,0.3)';
      ctx.fillRect(plot.worldX, plot.worldY, 60, 44);
    }
    ctx.restore();
  }
}

function drawCrops(ctx: CanvasRenderingContext2D, state: GameState) {
  if (state.currentMap !== 'home') return;

  for (const plot of state.farmPlots) {
    if (!plot.crop) continue;
    const { crop } = plot;
    const cx = plot.worldX + 30;
    const cy = plot.worldY + 38;
    const colors = CROP_COLORS[crop.type] || ['#90EE90', '#228B22', '#006400'];
    const color = colors[Math.min(crop.stage, colors.length - 1)];
    const scale = 0.4 + crop.stage * 0.2;

    ctx.save();
    ctx.translate(cx, cy);

    if (crop.stage === 0) {
      ctx.fillStyle = colors[0];
      ctx.beginPath();
      ctx.ellipse(0, 0, 6 * scale, 8 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (crop.stage === 1) {
      ctx.fillStyle = '#228B22';
      ctx.fillRect(-2, -16 * scale, 4, 16 * scale);
      ctx.fillStyle = colors[1];
      ctx.beginPath();
      ctx.ellipse(0, -18 * scale, 10 * scale, 8 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (crop.stage === 2) {
      ctx.fillStyle = '#228B22';
      ctx.fillRect(-2, -22 * scale, 4, 22 * scale);
      ctx.fillStyle = colors[1];
      ctx.beginPath();
      ctx.arc(0, -24 * scale, 12 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#228B22';
      ctx.fillRect(-2, -26, 4, 26);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, -28, 16, 0, Math.PI * 2);
      ctx.fill();
      if (crop.ready) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.stroke();
        const t = Date.now() / 300;
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 18px serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓', 0, -44);
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();

    if (crop.stage > 0) {
      const progress = Math.min((Date.now() - crop.plantedAt) / crop.growTime, 1);
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(plot.worldX + 5, plot.worldY + 2, 50, 6);
      ctx.fillStyle = crop.ready ? '#00FF00' : '#FFD700';
      ctx.fillRect(plot.worldX + 5, plot.worldY + 2, 50 * progress, 6);
      ctx.restore();
    }
  }

  for (const plot of state.farmPlots) {
    if (!plot.crop || !plot.crop.ready) continue;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    const lx = plot.worldX + 30;
    const ly = plot.worldY - 14;
    ctx.roundRect(lx - 22, ly - 10, 44, 16, 4);
    ctx.fill();
    ctx.fillStyle = '#00FF00';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('READY', lx, ly);
    ctx.restore();
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState) {
  const chibi = images['/chibi_1774349990714.png'];
  const { x, y, facing, moving, playerAnimFrame } = state.player;

  const bobY = moving ? Math.sin(Date.now() / 120) * 3 : 0;
  const scale = facing === 'left' ? -1 : 1;

  ctx.save();
  ctx.translate(x, y + bobY);

  if (chibi) {
    const w = 52;
    const h = 72;
    ctx.scale(scale, 1);
    ctx.drawImage(chibi, -w / 2, -h, w, h);
  } else {
    ctx.fillStyle = '#FFB347';
    ctx.beginPath();
    ctx.arc(0, -32, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(-12, -20, 24, 28);
  }

  const shadowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
  shadowGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.scale(1 / scale, 1);
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawVFX(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const p of state.vfxParticles) {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;

    if (p.type === 'coin') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#DAA520';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (p.type === 'sparkle') {
      const s = p.size;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Date.now() / 200 + p.x);
      ctx.fillStyle = p.color;
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(0, -s * 1.5, s * 0.4, s * 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawDamageNumbers(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const d of state.damageNumbers) {
    const alpha = d.life / d.maxLife;
    const scale = 1 + (1 - alpha) * 0.5;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(d.x, d.y);
    ctx.scale(scale, scale);
    ctx.font = 'bold 20px "Press Start 2P", sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(`+${d.value}`, 0, 0);
    ctx.fillStyle = d.color;
    ctx.fillText(`+${d.value}`, 0, 0);
    ctx.restore();
  }
}

function drawMinimap(ctx: CanvasRenderingContext2D, state: GameState, width: number, height: number) {
  const mmW = 100, mmH = 70;
  const mmX = width - mmW - 10;
  const mmY = height - mmH - 10;
  const mapW = getMapWidth(state.currentMap);
  const mapH = getMapHeight(state.currentMap);

  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#1a1a2e';
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(mmX, mmY, mmW, mmH, 4);
  ctx.fill();
  ctx.stroke();

  const colors: Record<MapType, string> = {
    home: '#4a7c59',
    city: '#808080',
    fishing: '#1E90FF',
    garden: '#228B22',
  };
  ctx.fillStyle = colors[state.currentMap];
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.roundRect(mmX + 2, mmY + 2, mmW - 4, mmH - 4, 2);
  ctx.fill();
  ctx.globalAlpha = 0.8;

  const px = mmX + (state.player.x / mapW) * mmW;
  const py = mmY + (state.player.y / mapH) * mmH;
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(px, py, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFF';
  ctx.font = '7px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.currentMap.toUpperCase(), mmX + mmW / 2, mmY + mmH - 4);
  ctx.restore();
}
