import {
  GameState,
  MapType,
  FARM_GRID,
  CROP_STAGES_COLORS,
  MAP_SIZES,
  CROP_GROW_TIMES,
  CROP_GOLD_REWARDS,
  MAP_COLLISIONS,
  MAP_PLAYER_START,
  SHOP_ITEMS,
  CollisionRect,
  Tree,
  GARDEN_ROAD_Y,
} from "./Game";

const imgs: Record<string, HTMLImageElement> = {};

export function loadImg(src: string): Promise<HTMLImageElement> {
  if (imgs[src]) return Promise.resolve(imgs[src]);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imgs[src] = img;
      resolve(img);
    };
    img.onerror = () => resolve(img);
    img.src = src;
  });
}
export function preloadAssets() {
  return Promise.all(
    [
      "/chibi_1774349990714.png",
      "/home_1774349990715.jpg",
      "/map_city_new.png",
      "/map_fishing_new.png",
      "/map_garden_new.png",
      "/celurit_1774349990712.png",
      "/kapak_1774349990716.png",
      "/kapak_1_1774349990715.png",
      "/karung_1774349990717.png",
      "/map_suburban_1774358176142.png",
      "/teko_siram.png",
      "/walk.png",
      "/work.png",
      "/happy.png",
      "/logo.png",
      "/carrot.png",
      "/pumpkin.png",
      "/tomato.png",
      "/wheat.png",
      "/frame_001.png",
      "/frame_002.png",
      "/frame_003.png",
      "/frame_004.png",
      "/frame_005.png",
      "/frame_006.png",
      "/frame_007.png",
      "/frame_008.png",
      "/frame_009.png",
      "/frame_010.png",
      "/frame_011.png",
      "/frame_012.png",
      "/frame_1_berdiri.png",
      "/frame_2_jalan.png",
      "/frame_3_lari.png",
      "/frame_4_melompat.png",
      "/frame_5_duduk.png",
      "/frame_6_membungkuk.png",
      "/frame_7_merayap.png",
      "/frame_8_mengambil.png",
      "/frame_9_melempar.png",
      "/frame_10_menangkap.png",
      "/frame_11_berdiri.png",
      "/frame_12_jalan.png",
      "/farm_till.png",
      "/farm_plant.png",
      "/farm_water.png",
      "/farm_fertilize.png",
      "/farm_harvest.png",
      "/farm_weed.png",
      "/farm_check.png",
      "/farm_carry.png",
      "/player_walk1.png",
      "/player_walk2.png",
      "/jalan_kaki_10_tengah_langkah.png",
      "/jalan_kaki_11_akhir_langkah.png",
      "/jalan_kaki_1_berdiri_awal.png",
      "/jalan_kaki_12_siap_berhenti.png",
    ].map(loadImg),
  );
}

const MAP_IMGS: Record<MapType, string> = {
  home: "/home_1774349990715.jpg",
  city: "/map_city_new.png",
  fishing: "/map_fishing_new.png",
  garden: "/map_garden_new.png",
  suburban: "/map_suburban_1774358176142.png",
};

export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number,
  H: number,
) {
  const { zoom, cameraX, cameraY } = state;
  ctx.save();
  ctx.translate(-cameraX, -cameraY);
  ctx.scale(zoom, zoom);

  drawBackground(ctx, state);
  if (state.currentMap === "home") drawFarmPlots(ctx, state);
  if (state.currentMap === "home") drawTrees(ctx, state);
  if (state.currentMap === "fishing") drawFishingBobber(ctx, state);
  if (state.currentMap === "garden") drawNPCs(ctx, state);
  if (state.currentMap === "city") drawShopZones(ctx, state);
  drawFootprints(ctx, state);
  drawPlayer(ctx, state);
  drawVFX(ctx, state);
  drawDamageNumbers(ctx, state);
  drawMapLabels(ctx, state);

  if (state.currentMap === "home" && state.showFarmDebugOverlay) {
    drawFarmDebugOverlay(ctx, state);
  }

  ctx.restore();

  // SCREEN SPACE EFFECTS (VIGNETTE & BLOOM)
  ctx.save();
  const vignette = ctx.createRadialGradient(
    W / 2,
    H / 2,
    W / 4,
    W / 2,
    H / 2,
    W / 1.2,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawBackground(ctx: CanvasRenderingContext2D, state: GameState) {
  const { w, h } = MAP_SIZES[state.currentMap];
  const img = imgs[MAP_IMGS[state.currentMap]];
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, 0, 0, w, h);
  } else {
    const colors: Record<MapType, string[]> = {
      home: ["#4a7c59", "#5a8a68"],
      city: ["#888", "#666"],
      fishing: ["#2a6a3a", "#1a5a2a"],
      garden: ["#3a8a3a", "#4a9a4a"],
      suburban: ["#a0d0a0", "#90c090"],
    };
    const [c1, c2] = colors[state.currentMap];
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

function drawFarmPlots(ctx: CanvasRenderingContext2D, state: GameState) {
  const { cellW, cellH } = FARM_GRID;
  const now = state.time;
  const px = state.player.x,
    py = state.player.y;

  let nearestPlotId: string | null = null;
  let minDist = 80;
  for (const plot of state.farmPlots) {
    const ncx = FARM_GRID.startX + plot.gridX * cellW + cellW / 2;
    const ncy = FARM_GRID.startY + plot.gridY * cellH + cellH / 2;
    if (Math.hypot(ncx - px, ncy - py) < minDist) {
      minDist = Math.hypot(ncx - px, ncy - py);
      nearestPlotId = plot.id;
    }
  }

  for (const plot of state.farmPlots) {
    const drawX = FARM_GRID.startX + plot.gridX * cellW;
    const drawY = FARM_GRID.startY + plot.gridY * cellH;
    const cx = drawX + cellW / 2;
    const isNearest = plot.id === nearestPlotId && !!state.player.tool;

    ctx.save();
    // Grid Helper: Always show a faint outline for interactive plots
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    roundRect(ctx, drawX, drawY, cellW, cellH, 4);
    ctx.stroke();

    if (plot.tilled) {
      // Base soil color - more vibrant
      ctx.fillStyle = plot.watered ? "#3D2B1F" : "#5D4037";
      roundRect(ctx, drawX + 1, drawY + 1, cellW - 2, cellH - 2, 4);
      ctx.fill();

      // Soil row lines
      ctx.strokeStyle = plot.watered ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1.5;
      for (let r = 1; r <= 3; r++) {
        const ry = drawY + 2 + (r * (cellH - 4)) / 4;
        ctx.beginPath();
        ctx.moveTo(drawX + 4, ry);
        ctx.lineTo(drawX + cellW - 4, ry);
        ctx.stroke();
      }

      // If crop is growing — add rough/cracked texture on soil
      if (plot.crop) {
        const prog = Math.min(
          (Date.now() - plot.crop.plantedAt) / (plot.crop.growTime || 60000),
          1,
        );
        // Crack lines that appear as plant grows
        const crackCount = Math.floor(prog * 5) + 1;
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 0.8;
        // Deterministic cracks based on plot id hash
        const seed = plot.gridX * 7 + plot.gridY * 13;
        for (let c = 0; c < crackCount; c++) {
          const sx = drawX + 6 + ((seed * (c + 1) * 17) % (cellW - 12));
          const sy = drawY + 8 + ((seed * (c + 1) * 11) % (cellH - 16));
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(
            sx + ((seed * c * 5) % 10) - 5,
            sy + ((seed * c * 3) % 8) - 4,
          );
          ctx.stroke();
        }
        // Small soil clumps
        ctx.fillStyle = "rgba(80,40,10,0.35)";
        for (let c = 0; c < crackCount; c++) {
          const bx2 = drawX + 8 + ((seed * (c + 3) * 9) % (cellW - 16));
          const by2 = drawY + 10 + ((seed * (c + 2) * 7) % (cellH - 20));
          ctx.beginPath();
          ctx.ellipse(bx2, by2, 3, 2, (seed * c) % Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (isNearest) {
      ctx.strokeStyle = "rgba(255,220,100,0.3)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      roundRect(ctx, drawX + 2, drawY + 2, cellW - 4, cellH - 4, 4);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Nearest tilled: thin white outline only
    if (isNearest && plot.tilled) {
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, drawX + 1, drawY + 1, cellW - 2, cellH - 2, 4);
      ctx.stroke();
    }

    // Crop
    if (plot.crop) {
      const now = state.time;
      const { crop } = plot;
      const growTime = crop.growTime || 20000;
      const elapsed = now - crop.plantedAt;
      const prog = Math.min(elapsed / growTime, 1);

      let imgId = "";
      let emoji = "🌱";
      if (crop.type === "wheat") {
        imgId = "/wheat.png";
        emoji = "🌾";
      } else if (crop.type === "tomato") {
        imgId = "/tomato.png";
        emoji = "🍅";
      } else if (crop.type === "carrot") {
        imgId = "/carrot.png";
        emoji = "🥕";
      } else if (crop.type === "pumpkin") {
        imgId = "/pumpkin.png";
        emoji = "🎃";
      }

      const img = imgs[imgId];
      if (imgId && !imgs[imgId]) loadImg(imgId);

      const by = drawY + cellH - 4;
      const stageScales = [0.35, 0.55, 0.75, 0.92, 1.08];
      const stageYOffsets = [10, 7, 4, 1, -2];
      const stageImageSizes = [20, 28, 34, 40, 46];
      const currentStage = Math.max(0, Math.min(4, crop.stage));
      const baseScale = stageScales[currentStage];
      const baseYOffset = stageYOffsets[currentStage];
      const imageSize = stageImageSizes[currentStage];

      let scale = baseScale;
      let tiltAngle = 0;
      let shadowScaleX = 1;
      if (crop.ready) {
        const t = now / 600;
        tiltAngle = Math.sin(t) * 0.18;
        scale = baseScale + Math.abs(Math.sin(t * 1.3)) * 0.06;
        shadowScaleX = 1 + Math.abs(Math.sin(t)) * 0.15;
      }

      // Soil contact shadow for every stage
      ctx.save();
      ctx.globalAlpha = crop.ready ? 0.24 : 0.14;
      ctx.fillStyle = "#000";
      ctx.scale(shadowScaleX, 0.34);
      ctx.beginPath();
      ctx.ellipse(
        cx / shadowScaleX,
        (by + 2 + baseYOffset) / 0.34,
        (7 + currentStage * 2) * scale,
        3 + currentStage * 0.35,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();

      // Stem/leaf primitives on early stages so growth is visible
      if (currentStage <= 2) {
        ctx.save();
        const stemTop = by - 8 - currentStage * 5;
        ctx.strokeStyle = "#3d8b3d";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, by + baseYOffset - 1);
        ctx.lineTo(cx, stemTop);
        ctx.stroke();

        if (currentStage >= 1) {
          ctx.fillStyle = "#66bb66";
          ctx.beginPath();
          ctx.ellipse(cx - 4, stemTop + 4, 4, 2.6, -0.45, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(cx + 4, stemTop + 6, 4.2, 2.8, 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
        if (currentStage >= 2) {
          ctx.fillStyle = "#7acb7a";
          ctx.beginPath();
          ctx.ellipse(cx - 6, stemTop - 1, 4.6, 3, -0.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(cx + 6, stemTop + 1, 4.6, 3, 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.save();
      ctx.translate(cx, by + baseYOffset);
      ctx.rotate(tiltAngle);
      ctx.scale(scale, scale);
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, -imageSize / 2, -imageSize, imageSize, imageSize);
      } else {
        const emojiSize = 14 + currentStage * 5;
        ctx.font = `${emojiSize}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText(emoji, 0, -8);
      }
      ctx.restore();
    }

    ctx.font = "bold 8px Arial";
    ctx.textAlign = "center";
    let label = "";

    if (plot.crop) {
      if (!plot.watered) {
        label = "NEED WATER 💧";
      } else if (!plot.crop.ready) {
        const now = state.time;
        const elapsed = now - plot.crop.plantedAt;
        const prog = Math.min(elapsed / (plot.crop.growTime || 20000), 1);
        label = `${Math.floor(prog * 100)}% GROWING`;
      } else {
        label = plot.crop.type.toUpperCase();
      }
    } else if (plot.tilled) {
      label = "READY FOR SEEDS";
    }

    if (label) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillText(label, drawX + cellW / 2 + 1, drawY + 11); // Shadow
      ctx.fillStyle =
        plot.crop && !plot.watered
          ? "#FF4500"
          : plot.crop
            ? "#FFD700"
            : "#FFF5E0";
      ctx.fillText(label, drawX + cellW / 2, drawY + 10);
    }
    ctx.restore();
  }
}

function drawTrees(ctx: CanvasRenderingContext2D, state: GameState) {
  if (!state.trees) return;
  for (const tree of state.trees) {
    ctx.save();
    ctx.translate(tree.x, tree.y);

    // Shadow
    const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, 25);
    shadow.addColorStop(0, "rgba(0,0,0,0.3)");
    shadow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(0, 0, 25, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    if (tree.type === "rock") {
      // Rock/Boulder
      ctx.fillStyle = "#777";
      ctx.beginPath();
      ctx.ellipse(0, -10, 24, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#999";
      ctx.beginPath();
      ctx.ellipse(-8, -14, 10, 6, 0.4, 0, Math.PI * 2);
      ctx.fill(); // Highlight
    } else if (tree.type === "pine") {
      // Trunk
      ctx.fillStyle = "#4A2C08";
      ctx.fillRect(-6, -15, 12, 15);
      // Leaves
      ctx.fillStyle = "#1A3C1A";
      ctx.beginPath();
      ctx.moveTo(0, -65);
      ctx.lineTo(30, -35);
      ctx.lineTo(-30, -35);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -50);
      ctx.lineTo(35, -20);
      ctx.lineTo(-35, -20);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -35);
      ctx.lineTo(40, -5);
      ctx.lineTo(-40, -5);
      ctx.closePath();
      ctx.fill();
    } else {
      // Oak
      ctx.fillStyle = "#5D3A1A";
      ctx.fillRect(-8, -20, 16, 20);
      ctx.fillStyle = "#2D5A27";
      ctx.beginPath();
      ctx.arc(0, -45, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-15, -30, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(15, -30, 22, 0, Math.PI * 2);
      ctx.fill();
    }

    if (tree.hp < tree.maxHp) {
      ctx.fillStyle = "#333";
      ctx.fillRect(-20, -75, 40, 5);
      ctx.fillStyle = "#F44";
      ctx.fillRect(-20, -75, 40 * (tree.hp / tree.maxHp), 5);
    }
    ctx.restore();
  }
}

function drawFishingBobber(ctx: CanvasRenderingContext2D, state: GameState) {
  const b = state.fishBobber;
  if (!b.active) return;

  const bx = b.x,
    by = b.y + Math.sin(b.bobTimer) * 5;
  ctx.save();
  ctx.strokeStyle = "rgba(180,180,180,0.6)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(state.player.x, state.player.y - 20);
  ctx.lineTo(bx, by);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(bx, by, 7, 0, Math.PI * 2);
  ctx.fillStyle = b.biting ? "#FF4444" : "#FF2200";
  ctx.fill();
  ctx.strokeStyle = "#FFF";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const topY = by - 10;
  ctx.fillStyle = b.biting ? "#FF8800" : "#DDDDDD";
  ctx.beginPath();
  ctx.arc(bx, topY, 4, 0, Math.PI * 2);
  ctx.fill();

  if (b.biting) {
    const pulse = Math.abs(Math.sin(state.time / 8));
    ctx.globalAlpha = pulse;
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeText("!! PRESS E !!", bx, by - 20);
    ctx.fillStyle = "#FFD700";
    ctx.fillText("!! PRESS E !!", bx, by - 20);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawNPCs(ctx: CanvasRenderingContext2D, state: GameState) {
  for (let i = 0; i < state.npcs.length; i++) {
    const npc = state.npcs[i];

    // NPC INDIVIDUAL ANIMATION PHASING (Offset to prevent robotic sync)
    const timeScale = state.time + i * 1234;
    const idleFeet =
      (timeScale / 600) % 2 < 1
        ? "/jalan_kaki_1_berdiri_awal.png"
        : "/jalan_kaki_12_siap_berhenti.png";

    // VARIETY IN NPC BEHAVIOR (Mixing default idle with mood frames)
    const moods = [
      idleFeet,
      "/frame_004.png",
      idleFeet,
      "/frame_006.png",
      idleFeet,
      "/frame_007.png",
    ];
    const spriteIdx = Math.floor(timeScale / 2500) % moods.length;
    const sprite = imgs[moods[spriteIdx]] || imgs[idleFeet];

    ctx.save();
    ctx.translate(npc.x, npc.y);
    const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, 14);
    shadow.addColorStop(0, "rgba(0,0,0,0.25)");
    shadow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // REMOVED BOBBING/SQUASHING FOR STABILITY
    const flip = Math.sin(state.time / 2000 + i) > 0 ? 1 : -1;
    ctx.scale(flip, 1);

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      // SCALED DOWN TO MATCH PLAYER SIZE (targetH = 38)
      const targetH = 38;
      const ratio = sprite.naturalWidth / sprite.naturalHeight;
      const dw = targetH * ratio * 0.9;
      const dh = targetH;
      ctx.drawImage(sprite, -dw / 2, -dh + 5, dw, dh);
    } else {
      ctx.fillStyle = npc.color;
      ctx.beginPath();
      ctx.arc(0, -32, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.scale(flip, 1); // unflip for text
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.beginPath();
    ctx.roundRect(-22, -80, 44, 14, 4);
    ctx.fill();
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(npc.name, 0, -70);
    ctx.restore();
  }
}

function drawShopZones(ctx: CanvasRenderingContext2D, state: GameState) {
  const shops = [
    { x: 130, y: 460, label: "SEEDS SHOP" },
    { x: 380, y: 460, label: "TOOLS SHOP" },
    { x: 630, y: 460, label: "FARM SUPPLY" },
    { x: 830, y: 460, label: "MARKET" },
  ];
  const px = state.player.x,
    py = state.player.y;
  for (const shop of shops) {
    const dist = Math.hypot(shop.x - px, shop.y - py);
    const isNear = dist < 90;

    ctx.save();
    ctx.translate(shop.x, shop.y - 110);

    // Sign post
    ctx.fillStyle = "#3A2010";
    ctx.fillRect(-3, 16, 6, 22);
    ctx.fillStyle = "#6B4020";
    ctx.fillRect(-1, 16, 2, 22);

    // Glow when near
    if (isNear) {
      ctx.shadowColor = "#D4A800";
      ctx.shadowBlur = 14;
    }

    // Drop shadow (bottom offset like .wb button)
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    roundRect(ctx, -50, -18 + 4, 100, 36, 18);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Dark border (outer) — like .wb border #5C4033
    ctx.fillStyle = "#3A2010";
    roundRect(ctx, -50, -18, 100, 36, 18);
    ctx.fill();

    // Brown gradient fill — like .wb background
    const grad = ctx.createLinearGradient(0, -18, 0, 18);
    if (isNear) {
      grad.addColorStop(0, "#D9B380");
      grad.addColorStop(1, "#AD7D54");
    } else {
      grad.addColorStop(0, "#CE9E64");
      grad.addColorStop(1, "#8D5A32");
    }
    roundRect(ctx, -47, -15, 94, 30, 15);
    ctx.fillStyle = grad;
    ctx.fill();

    // Inner top highlight
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    roundRect(ctx, -44, -14, 88, 12, 10);
    ctx.fill();

    // "SHOP" text — yellow, pixel font, like .wb
    ctx.fillStyle = "#FFD700";
    ctx.font = 'bold 10px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText("SHOP", 0, 1);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.restore();

    // Interaction prompt when near
    if (isNear) {
      ctx.save();
      const tx = shop.x,
        ty = shop.y - 52;
      const bw = 120,
        bh = 38;

      // Drop shadow
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      roundRect(ctx, tx - bw / 2, ty - bh / 2 + 4, bw, bh, 12);
      ctx.fill();

      // Dark outer border
      ctx.fillStyle = "#3A2010";
      roundRect(ctx, tx - bw / 2, ty - bh / 2, bw, bh, 12);
      ctx.fill();

      // Brown gradient fill
      const tg = ctx.createLinearGradient(0, ty - bh / 2, 0, ty + bh / 2);
      tg.addColorStop(0, "#CE9E64");
      tg.addColorStop(1, "#8D5A32");
      roundRect(ctx, tx - bw / 2 + 3, ty - bh / 2 + 3, bw - 6, bh - 6, 9);
      ctx.fillStyle = tg;
      ctx.fill();

      // Inner top highlight
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      roundRect(ctx, tx - bw / 2 + 5, ty - bh / 2 + 4, bw - 10, 10, 6);
      ctx.fill();

      // Shop name — yellow pixel
      ctx.fillStyle = "#FFD700";
      ctx.font = 'bold 8px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "#000";
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(shop.label, tx, ty - 8);

      // Press E hint
      ctx.fillStyle = "#FFF5C0";
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText("PRESS E", tx, ty + 10);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.restore();
    }
  }
}

function drawFootprints(ctx: CanvasRenderingContext2D, state: GameState) {
  if (!state.footprints) return;
  for (const fp of state.footprints) {
    const alpha = (fp.life / fp.maxLife) * 0.55;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(fp.x, fp.y);

    // Rotate footprint based on facing direction
    const rot =
      fp.facing === "right"
        ? Math.PI / 2
        : fp.facing === "left"
          ? -Math.PI / 2
          : fp.facing === "up"
            ? Math.PI
            : 0;
    ctx.rotate(rot);

    // Mirror for left/right foot
    if (fp.foot === "right") ctx.scale(-1, 1);

    // Draw a simple shoe-sole shape
    ctx.fillStyle = "rgba(60,30,10,0.7)";
    ctx.beginPath();
    // Heel
    ctx.ellipse(0, 3, 3.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Toe
    ctx.beginPath();
    ctx.ellipse(0, -4, 2.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState) {
  const {
    x,
    y,
    facing,
    moving,
    action,
    actionTimer,
    running,
    targetX,
    targetY,
    jumpY,
  } = state.player;

  const isWalking =
    (moving || targetX !== null) &&
    !state.notification?.text.includes("LEVEL UP");
  const isJumping = jumpY && jumpY < -5;
  const walkSpeed = running ? 80 : 130;
  const walkCycle = (state.time / walkSpeed) % 4;

  let sprite: HTMLImageElement | null = null;

  if (state.notification?.text.includes("LEVEL UP")) {
    sprite =
      imgs[state.time % 1000 < 500 ? "/frame_011.png" : "/frame_012.png"];
  } else if (isJumping) {
    sprite = imgs["/frame_4_melompat.png"];
  } else if (action && actionTimer > 0) {
    if (state.currentMap === "home") {
      if (action === "hoe") sprite = imgs["/farm_till.png"];
      else if (action.includes("seed")) sprite = imgs["/farm_plant.png"];
      else if (action === "water") sprite = imgs["/farm_water.png"];
      else if (action === "fertilizer") sprite = imgs["/farm_fertilize.png"];
      else if (
        action === "axe" ||
        action === "axe-large" ||
        action === "sickle"
      )
        sprite = imgs["/farm_weed.png"];
      else sprite = imgs["/farm_check.png"];
    } else {
      sprite = imgs["/frame_8_mengambil.png"];
    }
  } else if (state.fishingActive && state.fishBobber.biting) {
    sprite = imgs["/frame_10_menangkap.png"];
  } else if (isWalking) {
    if (running) {
      sprite = imgs["/frame_3_lari.png"];
    } else {
      const walkFrames = [
        "/player_walk1.png",
        "/jalan_kaki_10_tengah_langkah.png",
        "/player_walk2.png",
        "/jalan_kaki_11_akhir_langkah.png",
      ];
      sprite = imgs[walkFrames[Math.floor(walkCycle)]];
    }
  } else {
    const idleFeet =
      (state.time / 600) % 2 < 1
        ? "/jalan_kaki_1_berdiri_awal.png"
        : "/jalan_kaki_12_siap_berhenti.png";
    const cycle = Math.floor(state.time / 2000) % 12;
    const moodMap: Record<number, string> = {
      0: idleFeet,
      1: idleFeet,
      2: "/frame_004.png",
      3: idleFeet,
      4: "/frame_007.png",
      5: idleFeet,
      6: "/frame_006.png",
      7: idleFeet,
      8: idleFeet,
      9: idleFeet,
      10: idleFeet,
      11: "/frame_005.png",
    };
    sprite = imgs[moodMap[cycle]] || imgs[idleFeet];
  }

  if (!sprite || !sprite.complete)
    sprite =
      imgs["/jalan_kaki_1_berdiri_awal.png"] ||
      imgs["/chibi_1774349990714.png"];

  const walkBob = 0;
  const breathing = !isWalking ? Math.sin(state.time / 600) * 0.8 : 0;
  const squashStretch = !isWalking ? 1 + Math.sin(state.time / 600) * 0.02 : 1;

  ctx.save();
  ctx.translate(x, y);

  const shadowOpacity = 0.35 - walkBob * 0.012 - breathing * 0.005;
  ctx.save();
  ctx.scale(1.4 + (isWalking ? walkBob * 0.025 : 0), 0.35);
  ctx.fillStyle = `rgba(0,0,0,${shadowOpacity})`;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const jF = state.player.jumpFlip || 0;
  ctx.translate(0, (jumpY || 0) - walkBob - breathing);
  ctx.rotate((jF * Math.PI) / 180);

  const cityScale = state.currentMap === "city" ? 1.35 : 1.0;
  const flipX = facing === "left" ? -1 : 1;
  ctx.scale(flipX * cityScale, cityScale * squashStretch);

  if (sprite && sprite.complete && sprite.naturalWidth > 0) {
    const targetH = 38;
    const ratio = sprite.naturalWidth / sprite.naturalHeight;
    const drawW = targetH * ratio * 0.96;
    const drawH = targetH;
    const ox = -drawW / 2;
    const oy = -drawH + 4;

    if (action && actionTimer > 0) {
      const swingProgress = (35 - actionTimer) / 35;
      const swingAngle = Math.sin(swingProgress * Math.PI) * 25;
      ctx.rotate((swingAngle * Math.PI) / 180);
      ctx.drawImage(sprite, ox, oy, drawW, drawH);

      const toolImg = getToolImg(action);
      if (toolImg && toolImg.complete) {
        ctx.save();
        // Hand: lower right side, below face level
        const handX = drawW * 0.45;
        const handY = oy + drawH * 0.72;
        ctx.translate(handX, handY);
        ctx.rotate(((15 + swingAngle * 0.5) * Math.PI) / 180);
        ctx.drawImage(toolImg, -9, -9, 18, 18);
        ctx.restore();
      }
    } else {
      ctx.drawImage(sprite, ox, oy, drawW, drawH);

      const selectedTool = state.player.tool;
      const heldToolImg = selectedTool ? getToolImg(selectedTool) : null;
      if (heldToolImg && heldToolImg.complete) {
        ctx.save();
        const toolBob = Math.sin(state.time / 300) * 1.0;
        // Hand: right side at waist/hip level — well below face
        const handX = drawW * 0.48;
        const handY = oy + drawH * 0.75 + toolBob;
        ctx.translate(handX, handY);
        ctx.rotate(0.4 * Math.PI);
        ctx.drawImage(heldToolImg, -9, -9, 18, 18);
        ctx.restore();
      }
    }
  }
  ctx.restore();
}

function getToolImg(t: string | undefined): HTMLImageElement | null {
  if (!t) return null;
  if (t === "axe") return imgs["/kapak_1_1774349990715.png"];
  if (t === "axe-large") return imgs["/kapak_1774349990716.png"];
  if (t === "celurit" || t === "shovel" || t === "hoe" || t === "sickle")
    return imgs["/celurit_1774349990712.png"];
  if (t === "water") return imgs["/teko_siram.png"];
  if (t.includes("seed") || t === "fertilizer" || t === "karung")
    return imgs["/karung_1774349990717.png"];
  return null;
}

function drawVFX(ctx: CanvasRenderingContext2D, state: GameState) {
  // Always show bubble — driven by state.bubbleText
  drawInstructionBubble(ctx, state);

  for (const p of state.vfxParticles) {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (p.type === "coin") {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === "sparkle") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(state.time / 200 + p.x);
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(
          0,
          -p.size * 1.4,
          p.size * 0.35,
          p.size * 1.4,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.restore();
    } else if (p.type === "drop") {
      ctx.save();
      ctx.translate(p.x, p.y);
      const angle = Math.atan2(p.vy, p.vx) + Math.PI / 2;
      ctx.rotate(angle);
      const s = p.size * (0.3 + 0.7 * (p.life / p.maxLife));
      ctx.fillStyle = "rgba(173, 216, 230, 0.9)"; // Light Water Blue
      ctx.beginPath();
      ctx.moveTo(0, -s * 2);
      ctx.quadraticCurveTo(s, s, 0, s);
      ctx.quadraticCurveTo(-s, s, 0, -s * 2);
      ctx.fill();
      // Specular highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.beginPath();
      ctx.arc(-s / 3, -s / 2, s / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.type === "dust") {
      const s = p.size;
      const alpha = (p.life / p.maxLife) * 0.6;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalAlpha = alpha;

      const grd = ctx.createRadialGradient(0, 0, 1, 0, 0, s);
      grd.addColorStop(0, p.color);
      grd.addColorStop(1, "transparent");

      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.type === "bubble") {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
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
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.strokeText(d.text, d.x, d.y);
    ctx.fillStyle = d.color;
    ctx.fillText(d.text, d.x, d.y);
    ctx.restore();
  }
}

function drawInstructionBubble(
  ctx: CanvasRenderingContext2D,
  state: GameState,
) {
  const { x, y } = state.player;
  const text = state.bubbleText || "";
  if (!text) return;

  ctx.save();
  ctx.font = '6px "Press Start 2P", "Courier New", monospace';
  const tw = ctx.measureText(text).width + 24;
  const th = 22;
  // Position above head, never overlapping player
  const bx = x;
  const by = y - 68;

  // Wood panel bubble
  const grd = ctx.createLinearGradient(0, by - th / 2, 0, by + th / 2);
  grd.addColorStop(0, "#CE9E64");
  grd.addColorStop(1, "#8D5A32");

  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = grd;
  ctx.strokeStyle = "#5C4033";
  ctx.lineWidth = 2.5;
  roundRect(ctx, bx - tw / 2, by - th / 2, tw, th, 10);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Tail
  ctx.beginPath();
  ctx.moveTo(bx - 8, by + th / 2);
  ctx.lineTo(bx + 8, by + th / 2);
  ctx.lineTo(bx, by + th / 2 + 10);
  ctx.closePath();
  ctx.fillStyle = "#8D5A32";
  ctx.fill();
  ctx.strokeStyle = "#5C4033";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Text
  ctx.fillStyle = "#FFF8E8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#000";
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.fillText(text, bx, by);
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawFarmDebugOverlay(ctx: CanvasRenderingContext2D, state: GameState) {
  const panelX = 14;
  const panelY = 14;
  const rowH = 16;
  const maxRows = 10;
  const rows = state.farmPlots.slice(0, maxRows);

  const panelW = 440;
  const panelH = 44 + rows.length * rowH;

  ctx.save();
  ctx.globalAlpha = 0.94;
  ctx.fillStyle = "rgba(24,18,14,0.92)";
  roundRect(ctx, panelX, panelY, panelW, panelH, 10);
  ctx.fill();

  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 2;
  roundRect(ctx, panelX, panelY, panelW, panelH, 10);
  ctx.stroke();

  ctx.font = 'bold 10px "Press Start 2P", monospace';
  ctx.fillStyle = "#FFD700";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("FARM DEBUG OVERLAY", panelX + 10, panelY + 8);

  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = "#EEE1C6";
  const hdr = "ID     T W F  CROP      STAGE READY  PROG";
  ctx.fillText(hdr, panelX + 10, panelY + 24);

  const now = state.time;
  rows.forEach((plot, i) => {
    const y = panelY + 40 + i * rowH;
    const crop = plot.crop;
    const cropType = crop
      ? crop.type.toUpperCase().padEnd(8, " ")
      : "-".padEnd(8, " ");
    const stage = crop ? String(crop.stage).padEnd(5, " ") : "-".padEnd(5, " ");
    const ready = crop ? (crop.ready ? "Y" : "N") : "-";
    const growTime = crop?.growTime || 1;
    const elapsed = crop ? Math.max(0, now - crop.plantedAt) : 0;
    const progNum = crop
      ? Math.min(100, Math.floor((elapsed / growTime) * 100))
      : 0;
    const prog = `${String(progNum).padStart(3, " ")}%`;

    const rowText =
      `${plot.id.padEnd(6, " ")} ` +
      `${plot.tilled ? "1" : "0"} ${plot.watered ? "1" : "0"} ${plot.fertilized ? "1" : "0"}  ` +
      `${cropType} ${stage}  ${ready}     ${prog}`;

    ctx.fillStyle = plot.id === state.hoveredPlotId ? "#9CF0A9" : "#EEE1C6";
    ctx.fillText(rowText, panelX + 10, y);
  });

  if (state.farmPlots.length > maxRows) {
    ctx.fillStyle = "#CDB892";
    ctx.fillText(
      `... +${state.farmPlots.length - maxRows} more plots`,
      panelX + 10,
      panelY + panelH - 12,
    );
  }

  ctx.restore();
}

function drawMapLabels(ctx: CanvasRenderingContext2D, state: GameState) {
  const { currentMap, player } = state;
  const labels: Record<string, { x: number; y: number; text: string }[]> = {
    city: [
      { x: 130, y: 460, text: "SEED MARKET" },
      { x: 380, y: 460, text: "TOOLS CENTER" },
      { x: 630, y: 460, text: "VESTING SHOP" },
      { x: 830, y: 460, text: "SUPPLY HUB" },
    ],
    garden: [
      { x: 520, y: 350, text: "SOCIAL HUB" },
      { x: 320, y: 420, text: "FRIEND SPOT" },
      { x: 700, y: 380, text: "CHAT ZONE" },
    ],
    suburban: [
      { x: 300, y: 300, text: "COZY RESIDENCE" },
      { x: 700, y: 250, text: "NEIGHBORHOOD" },
      { x: 520, y: 150, text: "QUIET AREA" },
    ],
    fishing: [
      { x: 520, y: 240, text: "DEEP WATER" },
      { x: 200, y: 240, text: "CAST HERE" },
      { x: 800, y: 240, text: "RARE FISH HUB" },
    ],
  };

  const mapList = labels[currentMap] || [];
  for (const l of mapList) {
    const dist = Math.hypot(l.x - player.x, l.y - player.y);
    const alpha = Math.max(0.1, 1 - dist / 500);
    ctx.save();
    ctx.globalAlpha = alpha;
    drawHologram(ctx, l.x, l.y - 70, l.text);
    ctx.restore();
  }
}

function drawHologram(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  text: string,
) {
  ctx.save();
  ctx.font = 'bold 8px "Press Start 2P", monospace';
  const tw = ctx.measureText(text).width;
  const padding = 12;
  const bw = tw + padding * 2;
  const bh = 22;

  const dy = Math.sin(Date.now() / 600) * 4;
  ctx.translate(cx, cy + dy);

  ctx.fillStyle = "rgba(62, 39, 23, 0.85)";
  roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 8);
  ctx.fill();

  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 1.5;
  roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 8);
  ctx.stroke();

  ctx.fillStyle = "#FFD700";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
