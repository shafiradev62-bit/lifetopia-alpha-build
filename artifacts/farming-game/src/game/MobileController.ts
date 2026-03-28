/**
 * MobileController.ts
 * Quadrant touch navigation + context-aware tap + pathfinding for mobile
 */

export type QuadrantDir = "up" | "down" | "left" | "right" | null;

export interface TouchState {
  activeDir: QuadrantDir;
  touchId: number | null;
}

/** Divide viewport into 4 transparent quadrants and return direction */
export function getTouchQuadrant(
  clientX: number,
  clientY: number,
  viewW: number,
  viewH: number,
): QuadrantDir {
  const cx = viewW / 2;
  const cy = viewH / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  // Dead zone in center (10% of smallest dimension) — prevents accidental triggers
  const dead = Math.min(viewW, viewH) * 0.10;
  if (Math.abs(dx) < dead && Math.abs(dy) < dead) return null;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "right" : "left";
  }
  return dy > 0 ? "down" : "up";
}

/** Map quadrant direction to game key names */
export function quadrantToKeys(dir: QuadrantDir): string[] {
  if (dir === "up") return ["arrowup"];
  if (dir === "down") return ["arrowdown"];
  if (dir === "left") return ["arrowleft"];
  if (dir === "right") return ["arrowright"];
  return [];
}

/** Detect if running in a mobile browser (Capacitor or mobile web) */
export function isMobilePlatform(): boolean {
  if (typeof window === "undefined") return false;
  // Capacitor sets this
  if ((window as any).Capacitor?.isNativePlatform?.()) return true;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/** Open Phantom or MetaMask via Universal Link / deep link on mobile */
export function openWalletDeepLink(walletType: "phantom" | "metamask", dappUrl: string): void {
  const encoded = encodeURIComponent(dappUrl);
  if (walletType === "phantom") {
    // Phantom Universal Link — opens app if installed, App Store if not
    const phantomLink = `https://phantom.app/ul/browse/${encoded}?ref=${encoded}`;
    window.location.href = phantomLink;
  } else {
    // MetaMask deep link
    const mmLink = `https://metamask.app.link/dapp/${dappUrl.replace(/^https?:\/\//, "")}`;
    window.location.href = mmLink;
  }
}

/** Check if Phantom/MetaMask is injected (desktop) or needs deep link (mobile) */
export function detectWalletEnvironment(): {
  phantomInjected: boolean;
  metamaskInjected: boolean;
  isMobile: boolean;
} {
  const w = window as any;
  const phantomInjected = !!(w.solana?.isPhantom || w.phantom?.solana?.isPhantom);
  const eth = w.ethereum;
  const providers: any[] = Array.isArray(eth?.providers) ? eth.providers : eth ? [eth] : [];
  const metamaskInjected = providers.some((p: any) => p?.isMetaMask);
  return {
    phantomInjected,
    metamaskInjected,
    isMobile: isMobilePlatform(),
  };
}
