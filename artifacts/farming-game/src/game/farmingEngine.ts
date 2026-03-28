/**
 * Atomic farming phase machine — single writer pattern for plot interactions.
 * Visuals / physics read `phase`; transitions only from validated execute paths.
 */
export type FarmingEnginePhase =
  | { kind: "idle" }
  | {
      kind: "busy";
      plotId: string;
      plotUuid: string;
      toolKey: string;
    };

export function farmingEngineIdle(): FarmingEnginePhase {
  return { kind: "idle" };
}

export function farmingEngineBeginWork(
  plotId: string,
  plotUuid: string,
  toolKey: string,
): FarmingEnginePhase {
  return { kind: "busy", plotId, plotUuid, toolKey };
}

export function farmingEngineRelease(): FarmingEnginePhase {
  return { kind: "idle" };
}
