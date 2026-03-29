import type { GameState, Quest } from "./Game";
import { supabase } from "./supabase";

const STORAGE_KEY = (wallet: string) => `lifetopia_daily_quests_${wallet}`;

export function loadQuestClaimsFromStorage(wallet: string): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(wallet));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function saveQuestClaimsToStorage(wallet: string, claimedIds: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY(wallet), JSON.stringify(claimedIds));
  } catch {
    /* ignore */
  }
}

/** Add Supabase gold and persist local player gold. No-op if no wallet. */
export async function updateSupabaseGold(
  walletAddress: string,
  newGoldTotal: number,
): Promise<boolean> {
  if (!walletAddress || walletAddress.toLowerCase().startsWith("guest"))
    return false;
  try {
    const { error } = await supabase.from("players").upsert(
      {
        wallet_address: walletAddress,
        gold: newGoldTotal,
        last_seen: new Date().toISOString(),
      },
      { onConflict: "wallet_address" },
    );
    return !error;
  } catch {
    return false;
  }
}

export function getClaimableQuests(state: GameState): Quest[] {
  return state.quests.filter((q) => q.completed && !q.claimed);
}

export function bumpQuestProgress(state: GameState, type: Quest["type"]) {
  state.quests = state.quests.map((q) => {
    if (q.claimed || q.completed || q.type !== type) return q;
    const nc = q.current + 1;
    const done = nc >= q.target;
    return { ...q, current: Math.min(nc, q.target), completed: done };
  });
}

export function addEarnQuestProgress(state: GameState, goldDelta: number) {
  if (goldDelta <= 0) return;
  state.quests = state.quests.map((q) => {
    if (q.claimed || q.completed || q.type !== "earn") return q;
    const nc = Math.min(q.target, q.current + goldDelta);
    const done = nc >= q.target;
    return { ...q, current: nc, completed: done };
  });
}

/** Apply reward, mark claimed, persist storage + optional Supabase gold sync. */
export function claimQuestReward(
  state: GameState,
  questId: string,
  wallet: string,
): { reward: number } | null {
  const q = state.quests.find((x) => x.id === questId);
  if (!q || !q.completed || q.claimed) return null;
  const reward = q.reward;
  state.player.gold += reward;
  state.quests = state.quests.map((x) =>
    x.id === questId ? { ...x, claimed: true } : x,
  );
  const claimed = state.quests.filter((x) => x.claimed).map((x) => x.id);
  const storageKey =
    wallet && !wallet.toLowerCase().startsWith("guest")
      ? wallet
      : "_guest";
  saveQuestClaimsToStorage(storageKey, claimed);
  return { reward };
}

/** Atomic update to player inventory in Supabase */
export async function updateInventory(
  walletAddress: string,
  inventory: Record<string, number>
): Promise<boolean> {
  if (!walletAddress || walletAddress.toLowerCase().startsWith("guest")) return false;
  try {
    const { error } = await supabase.from("players").upsert(
      { wallet_address: walletAddress, inventory, last_seen: new Date().toISOString() },
      { onConflict: "wallet_address" }
    );
    return !error;
  } catch { return false; }
}

/** Check if all daily quests are done and set eligibility */
export async function checkQuestEligibility(state: GameState, wallet: string) {
  if (!wallet || wallet.toLowerCase().startsWith("guest")) return;
  const allDone = state.quests.every(q => q.completed);
  if (allDone) {
    try {
      await supabase.from("players").update({ nft_eligibility: true }).eq("wallet_address", wallet);
    } catch (e) { console.error("NFT eligibility sync failed", e); }
  }
}

export function applyStoredQuestClaims(state: GameState, wallet: string) {
  const key =
    wallet && wallet.length > 0 && !wallet.toLowerCase().startsWith("guest")
      ? wallet
      : "_guest";
  const claimed = loadQuestClaimsFromStorage(key);
  state.quests = state.quests.map((q) =>
    claimed.has(q.id)
      ? { ...q, claimed: true, completed: true, current: q.target }
      : q,
  );
  // Check eligibility on load
  if (wallet) void checkQuestEligibility(state, wallet);
}
