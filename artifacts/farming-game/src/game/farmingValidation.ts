import type { GameState } from "./Game";
import {
  FARM_GRID,
  farmPlotIsActionable,
  isCropPlantingUnlocked,
  toolIdToCrop,
  FarmBalancePreset,
} from "./Game";

/** Engine validation radius — all farm plot actions require player inside this range */
export const FARM_ACTION_RADIUS_PX = 80;

export function distanceToPlotCenter(s: GameState, plotId: string): number {
  const p = s.farmPlots.find((x) => x.id === plotId);
  if (!p) return 1e9;
  const { cellW, cellH } = FARM_GRID;
  const cx = FARM_GRID.startX + p.gridX * cellW + cellW / 2;
  const cy = FARM_GRID.startY + p.gridY * cellH + cellH / 2;
  return Math.hypot(s.player.x - cx, s.player.y - cy);
}

export function isPlayerInFarmActionRadius(s: GameState, plotId: string): boolean {
  return distanceToPlotCenter(s, plotId) <= FARM_ACTION_RADIUS_PX;
}

export function isToolMatchForPlot(
  plot: GameState["farmPlots"][number],
  tool: string | null,
): boolean {
  if (!tool) return false;
  return farmPlotIsActionable(plot, tool);
}

export function isLevelRequirementMetForSeed(
  tool: string,
  playerLevel: number,
  difficulty: FarmBalancePreset,
): boolean {
  if (!tool.endsWith("-seed")) return true;
  const crop = toolIdToCrop(tool);
  if (!crop) return false;
  return isCropPlantingUnlocked(crop, playerLevel, difficulty);
}

export type FarmActionGate =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Triple-check before any plot mutation: radius, tool↔plot, level for seeds.
 */
export function validateFarmAction(
  s: GameState,
  plotId: string,
  tool: string,
): FarmActionGate {
  const plot = s.farmPlots.find((p) => p.id === plotId);
  if (!plot) return { ok: false, reason: "Invalid plot" };

  if (!isPlayerInFarmActionRadius(s, plotId)) {
    return { ok: false, reason: "Too far!" };
  }

  if (!isToolMatchForPlot(plot, tool)) {
    return { ok: false, reason: "Wrong tool for this plot" };
  }

  if (tool.endsWith("-seed")) {
    const crop = toolIdToCrop(tool);
    if (
      crop &&
      !isCropPlantingUnlocked(crop, s.player.level, s.farmBalancePreset)
    ) {
      return { ok: false, reason: "Level too low for this seed" };
    }
  }

  return { ok: true };
}
