import { useEffect, useRef, useState, useCallback } from "react";
import {
  GameState, MapType, SHOP_ITEMS, FARM_GRID, FarmBalancePreset,
  applyFarmBalancePreset, getShopSeedPrice, toolIdToCrop,
  isCropPlantingUnlocked, seedUnlockLevel, CROP_GROW_TIMES,
  CROP_GOLD_REWARDS, CROP_HARVEST_XP, FARM_BALANCE_PRESETS,
} from "../game/Game";
import {
  createInitialState, updateGame, handleToolAction, switchMap, spawnText, handleFishingAction,
} from "../game/GameEngine";
import { renderGame, preloadAssets } from "../game/Renderer";
import { supabase } from "../game/supabase";
import { checkSolanaNFT } from "../game/blockchain";
import { applyNFTBoostsToState } from "../game/playerState";
import {
  getClaimableQuests, claimQuestReward, updateSupabaseGold, applyStoredQuestClaims,
} from "../game/questManager";
import { getShopItemBadge } from "../game/shopCatalog";
import SplashScreen from "../components/SplashScreen";
import PreFarmTutorial from "../components/tutorial/PreFarmTutorial";
import {
  transferTokenToUser, getTokenBalance, initializeTokenAccount,
} from "../game/solanaToken";
import { AudioManager } from "../game/AudioSystem";
import {
  signSolanaLogin, signEvmLogin, verifyWalletWithSupabase,
} from "../game/walletHandshake";
import {
  isMobilePlatform, openWalletDeepLink, detectWalletEnvironment,
} from "../game/MobileController";
import QuadrantController from "../components/QuadrantController";
import MobileHUD from "../components/MobileHUD";
import ActionPopup, { type ActionPopupData } from "../components/ActionPopup";
import { registerDemoTrigger, abortDemo } from "../game/DemoScript";

const TOOLS = [
  { id: "sickle",      label: "HOE",      img: "/celurit_1774349990712.png" },
  { id: "axe",         label: "AXE",      img: "/kapak_1_1774349990715.png" },
  { id: "axe-large",   label: "MEGA AXE", img: "/kapak_1774349990716.png" },
  { id: "water",       label: "WATER",    img: "/teko_siram.png" },
  { id: "wheat-seed",  label: "WHEAT",    img: "/wheat.png" },
  { id: "tomato-seed", label: "TOMATO",   img: "/tomato.png" },
  { id: "carrot-seed", label: "CARROT",   img: "/carrot.png" },
  { id: "pumpkin-seed",label: "PUMPKIN",  img: "/pumpkin.png" },
] as const;

const MAPS: { id: MapType; label: string; desc: string }[] = [
  { id: "home",     label: "Farm",     desc: "Your farm" },
  { id: "city",     label: "City",     desc: "Buy items" },
  { id: "fishing",  label: "Fishing",  desc: "Catch fish" },
  { id: "garden",   label: "Garden",   desc: "Meet players" },
  { id: "suburban", label: "Suburban", desc: "Cozy area" },
];

const TOOL_IDS = TOOLS.map((t) => t.id);

// ── Action popup definitions ──────────────────────────────────────────────────
function makeActionPopup(notifText: string, id: number): ActionPopupData | null {
  const t = notifText.toUpperCase();
  if (t.includes("TILLED"))    return { id, icon: "[ HOE ]", title: "SOIL TILLED!", subtitle: "Ready for seeds", color: "#8D5A32", accent: "#D4AF37", minimal: true };
  if (t.includes("PLANTED"))   return { id, icon: "[ SEED ]", title: "PLANTED!", subtitle: t.replace("PLANTED ", ""), color: "#2D5A3D", accent: "#6DBF82", minimal: true };
  if (t.includes("WATERED"))   return { id, icon: "[ WATER ]", title: "WATERED!", subtitle: "Crops will grow now", color: "#1A3A5C", accent: "#4FC3F7", minimal: true };
  if (t.includes("HARVEST") || (t.includes("+") && t.includes("G")))
    return { id, icon: "[ HARVEST ]", title: "HARVESTED!", subtitle: t, color: "#5C3A00", accent: "#FFD700", minimal: true };
  if (t.includes("FERTILIZ"))  return { id, icon: "[ BOOST ]", title: "FERTILIZED!", subtitle: "Growth boosted!", color: "#3A1A5C", accent: "#CE93D8", minimal: true };
  if (t.includes("CLEARED"))   return { id, icon: "[ AXE ]", title: "CLEARED!", subtitle: "Plot ready to till", color: "#4A2800", accent: "#FF8A65", minimal: true };
  if (t.includes("FISH") || t.includes("EXOTIC") || t.includes("RARE FISH"))
    return { id, icon: "[ FISH ]", title: "FISH CAUGHT!", subtitle: t, color: "#0D2B45", accent: "#29B6F6", minimal: true };
  if (t.includes("LEVEL UP"))  return { id, icon: "[ LVL UP ]", title: "LEVEL UP!", subtitle: t, color: "#3A2800", accent: "#FFD700", minimal: true };
  if (t.includes("QUEST") && t.includes("CLAIMED"))
    return { id, icon: "[ REWARD ]", title: "QUEST DONE!", subtitle: t, color: "#1A3A1A", accent: "#66BB6A", minimal: true };
  if (t.includes("PHANTOM CONNECTED") || t.includes("METAMASK CONNECTED"))
    return { id, icon: "[ WALLET ]", title: "CONNECTED!", subtitle: t, color: "#1A0A3A", accent: "#9D7BFF", minimal: true };
  if (t.includes("BOOST") || t.includes("NFT"))
    return { id, icon: "[ BOOST ]", title: "BOOST ACTIVE!", subtitle: t, color: "#0A2A0A", accent: "#B2FF59", minimal: true };
  return null;
}

function snapshotEconomy(p: GameState["player"]) {
  return { gold: p.gold, exp: p.exp, level: p.level, maxExp: p.maxExp, inventory: { ...p.inventory } };
}

function formatGrowDuration(ms: number): string {
  const s = Math.max(1, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

// ── Farm status helper — crystal-clear step-by-step instruction ──────────────
function getFarmStatusGuide(plots: GameState["farmPlots"], activeTool: string | null): { action: string; slot: number | null; slotLabel: string | null } {
  const ready     = plots.filter(p => p.crop?.ready).length;
  const dead      = plots.filter(p => p.crop?.dead).length;
  // needWater: has crop, not watered, not dead (includes stage 0 — just planted, not yet watered)
  const needWater = plots.filter(p => p.crop && !p.watered && !p.crop.dead && !p.crop.ready).length;
  const growing   = plots.filter(p => p.crop && !p.crop.ready && !p.crop.dead && p.watered).length;
  const needSeed  = plots.filter(p => p.tilled && !p.crop).length;
  const needTill  = plots.filter(p => !p.tilled).length;

  if (ready > 0)     return { action: `${ready} CROP${ready > 1 ? "S" : ""} READY — PRESS [1] HOE THEN CLICK PLOT`, slot: 1, slotLabel: "HOE" };
  if (dead > 0)      return { action: `${dead} WITHERED — PRESS [2] AXE THEN CLICK DEAD PLOT`, slot: 2, slotLabel: "AXE" };
  if (needWater > 0) return { action: `${needWater} PLOT${needWater > 1 ? "S" : ""} NEED WATER — PRESS [4] WATER CAN THEN CLICK PLOT`, slot: 4, slotLabel: "WATER" };
  if (growing > 0 && needSeed === 0 && needTill === 0)
    return { action: `${growing} CROP${growing > 1 ? "S" : ""} GROWING — WAIT OR USE BOOST BUTTON`, slot: null, slotLabel: null };
  if (needSeed > 0)  return { action: `${needSeed} PLOT${needSeed > 1 ? "S" : ""} READY FOR SEEDS — SELECT A SEED [5-8] THEN CLICK PLOT`, slot: 5, slotLabel: "SEED" };
  if (needTill > 0)  return { action: `${needTill} PLOT${needTill > 1 ? "S" : ""} UNTILLED — PRESS [1] HOE THEN CLICK SOIL`, slot: 1, slotLabel: "HOE" };
  return { action: "ALL PLOTS EMPTY — PRESS [1] HOE AND CLICK ANY SOIL PLOT", slot: 1, slotLabel: "HOE" };
}

export default function FarmingGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [ds, setDs] = useState<GameState>(stateRef.current);
  const [guestId] = useState(() => {
    const saved = localStorage.getItem("guest_id");
    if (saved) return saved;
    const nid = `guest_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem("guest_id", nid);
    return nid;
  });
  const [loaded, setLoaded] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [introTutorialDone, setIntroTutorialDone] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutStep, setTutStep] = useState(0);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletType, setWalletType] = useState<"solana" | "evm" | null>(null);
  const [nfts, setNfts] = useState<string[]>([]);
  const nftsRef = useRef<string[]>([]);
  const lastServerEconomyRef = useRef(snapshotEconomy(stateRef.current.player));
  const [phantomFound, setPhantomFound] = useState(false);
  const [metamaskFound, setMetamaskFound] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const initialLoadCompleteRef = useRef(false);
  const cloudSaveBusy = useRef(false);
  const [shopHoverId, setShopHoverId] = useState<string | null>(null);
  const gameRootRef = useRef<HTMLDivElement>(null);
  const goldHudRef = useRef<HTMLDivElement>(null);
  const [coinBursts, setCoinBursts] = useState<
    { id: number; sx: number; sy: number; tx: number; ty: number }[]
  >([]);
  // Action popup state
  const [actionPopup, setActionPopup] = useState<ActionPopupData | null>(null);
  const popupIdRef = useRef(0);
  const lastNotifRef = useRef<string>("");
  // Mobile detection
  const isMobile = isMobilePlatform();
  // localStorage buffer for mobile battery saving
  const localSaveBuffer = useRef<Record<string, unknown>>({});
  const localSaveDirty = useRef(false);
  // Boost charges (limited uses per session)
  const [boostCharges, setBoostCharges] = useState(3);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.removeItem("farm_grid");
    (FARM_GRID as any).cols = 3; (FARM_GRID as any).rows = 2;
    (FARM_GRID as any).cellW = 83; (FARM_GRID as any).cellH = 68;
    (FARM_GRID as any).startX = 197; (FARM_GRID as any).startY = 259;

    preloadAssets().then(() => setLoaded(true)).catch(() => setLoaded(true));

    // Disable context menu + user-select (mobile spam-tap safe)
    const noCtx = (e: MouseEvent) => e.preventDefault();
    const noTouch = (e: TouchEvent) => { if ((e.target as HTMLElement)?.tagName === "CANVAS") e.preventDefault(); };
    const noKey = (e: KeyboardEvent) => {
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && ["I","i","J","j"].includes(e.key)) || (e.ctrlKey && ["U","u"].includes(e.key)))
        e.preventDefault();
    };
    window.addEventListener("contextmenu", noCtx);
    window.addEventListener("touchstart", noTouch, { passive: false });
    window.addEventListener("keydown", noKey);
    // Pixel art sharpness
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.imageSmoothingEnabled = false;
    }
    return () => {
      window.removeEventListener("contextmenu", noCtx);
      window.removeEventListener("touchstart", noTouch);
      window.removeEventListener("keydown", noKey);
    };
  }, []);

  useEffect(() => { initialLoadCompleteRef.current = initialLoadComplete; }, [initialLoadComplete]);
  useEffect(() => { nftsRef.current = nfts; }, [nfts]);

  // ── Register window.startLifetopiaDemo() ──────────────────────────────────
  // Use refs so the demo always has fresh closures without re-registering
  const setSplashDoneRef = useRef(setSplashDone);
  const setIntroTutorialDoneRef = useRef(setIntroTutorialDone);
  const setWalletConnectedRef = useRef(setWalletConnected);
  const setWalletAddressRef = useRef(setWalletAddress);
  const setActivePanelRef = useRef(setActivePanel);
  const setDsRef = useRef(setDs);
  const triggerPopupRef = useRef<(t: string) => void>(() => {});

  useEffect(() => {
    setSplashDoneRef.current = setSplashDone;
    setIntroTutorialDoneRef.current = setIntroTutorialDone;
    setWalletConnectedRef.current = setWalletConnected;
    setWalletAddressRef.current = setWalletAddress;
    setActivePanelRef.current = setActivePanel;
    setDsRef.current = setDs;
  });

  useEffect(() => {
    registerDemoTrigger({
      stateRef,
      setDs: (s) => setDsRef.current(s),
      selectTool: (id) => {
        stateRef.current.player.tool = id as any;
        setDsRef.current({ ...stateRef.current });
      },
      doSwitchMap: (map) => {
        stateRef.current.currentMap = map as any;
        setDsRef.current({ ...stateRef.current });
      },
      setActivePanel: (p) => setActivePanelRef.current(p),
      setSplashDone: (v) => setSplashDoneRef.current(v),
      setIntroTutorialDone: (v) => setIntroTutorialDoneRef.current(v),
      setWalletConnected: (v) => setWalletConnectedRef.current(v),
      setWalletAddress: (v) => setWalletAddressRef.current(v),
      triggerPopup: (t) => triggerPopupRef.current(t),
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const closePanel = useCallback(() => setActivePanel(null), []);
  const doSwitchMap = (map: MapType) => {
    if (ds.demoMode && !isMobile) {
      // Keep demo but jump to map's slot so it stays there for 40s
      const cycle: MapType[] = ["home", "city", "garden", "suburban", "fishing"];
      const i = cycle.indexOf(map);
      if (i !== -1) stateRef.current.demoTimer = i * 40000;
    } else if (ds.demoMode) {
      abortDemo();
    }
    stateRef.current = switchMap(stateRef.current, map);
    saveProgress();
    setDs({ ...stateRef.current });
  };

  // ── Notification → ActionPopup bridge ────────────────────────────────────
  const triggerPopup = useCallback((text: string) => {
    if (text === lastNotifRef.current) return;
    lastNotifRef.current = text;
    const id = ++popupIdRef.current;
    const popup = makeActionPopup(text, id);
    if (popup) setActionPopup(popup);
  }, []);

  // Keep triggerPopupRef in sync so demo can call it
  useEffect(() => { triggerPopupRef.current = triggerPopup; }, [triggerPopup]);

  // ── Splash / Tutorial ─────────────────────────────────────────────────────
  const handleSplashSelect = useCallback((map: MapType) => {
    AudioManager.init();
    AudioManager.playBGM("/backsound.mp3");
    doSwitchMap(map);
    setSplashDone(true);
    setIntroTutorialDone(false);
  }, [doSwitchMap]);

  const handlePreFarmTutorialFinished = useCallback(() => {
    setIntroTutorialDone(true);
    stateRef.current.currentMap = "home";
    stateRef.current.notification = { text: "WELCOME TO LIFETOPIA FARM!", life: 160 };
    setDs({ ...stateRef.current });
    // Auto-start demo immediately after tutorial skip/finish
    setTimeout(() => {
      doSwitchMap("home"); // Ensure we land exactly at farm
      (window as any).startLifetopiaDemo?.();
    }, 600);
  }, []);

  const handlePreFarmMapFocus = useCallback((map: MapType) => {
    stateRef.current.currentMap = map;
    setDs({ ...stateRef.current });
  }, []);

  // ── Wallet detection ──────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      const env = detectWalletEnvironment();
      setPhantomFound(env.phantomInjected);
      setMetamaskFound(env.metamaskInjected);
    };
    check();
    const t = setTimeout(check, 800);
    window.addEventListener("ethereum#initialized", check as EventListener, { once: true });
    return () => { clearTimeout(t); window.removeEventListener("ethereum#initialized", check as EventListener); };
  }, []);

  // ── Connect Phantom (with mobile deep link) ───────────────────────────────
  const connectPhantom = async () => {
    const env = detectWalletEnvironment();
    // Mobile: no injected wallet → deep link immediately
    if (env.isMobile && !env.phantomInjected) {
      const dappUrl = window.location.href;
      openWalletDeepLink("phantom", dappUrl);
      stateRef.current.notification = { text: "OPENING PHANTOM APP...", life: 120 };
      setDs({ ...stateRef.current });
      return;
    }
    try {
      const w = window as any;
      const sol = w.solana ?? w.phantom?.solana;
      if (!sol?.connect) {
        if (env.isMobile) { openWalletDeepLink("phantom", window.location.href); return; }
        window.open("https://phantom.app/download", "_blank");
        return;
      }
      // Instant connect call - no UI updates before extension trigger
      const res = await sol.connect({ onlyIfTrusted: false });
      if (!res || (!res.publicKey && !sol.publicKey)) throw new Error("No public key");
      
      stateRef.current.notification = { text: "CONNECTING PHANTOM...", life: 100 };
      setDs({ ...stateRef.current });
      
      const addr = (res.publicKey || sol.publicKey).toString();
      await _onWalletConnected(addr, "solana", sol);
    } catch (e: any) {
      stateRef.current.notification = { text: (e?.message || "CONNECT FAILED").toUpperCase().slice(0, 40), life: 120 };
      setDs({ ...stateRef.current });
    }
  };

  // ── Connect MetaMask (with mobile deep link) ──────────────────────────────
  const connectMetaMask = async () => {
    try {
      // Direct detection: check window.ethereum first
      let provider = (window as any).ethereum;
      
      // Handle multiple providers (e.g. MetaMask + Brave)
      if (provider?.providers) {
        provider = provider.providers.find((p: any) => p.isMetaMask) || provider.providers[0];
      }
      
      if (!provider) {
        // Fallback to manual link ONLY if no provider found after attempt
        stateRef.current.notification = { text: "METAMASK NOT FOUND", life: 100 };
        setDs({ ...stateRef.current });
        window.open("https://metamask.io/download/", "_blank");
        return;
      }
      
      stateRef.current.notification = { text: "SYNCING WALLET...", life: 100 };
      setDs({ ...stateRef.current });
      
      // Force request accounts immediately
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const addr = accounts?.[0];
      if (!addr) throw new Error("Connection rejected");
      
      await _onWalletConnected(addr, "evm", provider);
    } catch (e: any) {
      stateRef.current.notification = { text: (e?.message || "CONNECT FAILED").toUpperCase().slice(0, 40), life: 120 };
      setDs({ ...stateRef.current });
    }
  };

  const _onWalletConnected = async (addr: string, type: "solana" | "evm", provider: any) => {
    setWalletAddress(addr);
    setWalletType(type);
    setWalletConnected(true);
    localStorage.setItem("wallet_addr", addr);
    localStorage.setItem("wallet_type", type);
    stateRef.current.player.walletAddress = addr;
    setInitialLoadComplete(false);
    await loadProgress(addr);
    try {
      const proof = type === "solana"
        ? await signSolanaLogin(provider, addr)
        : await signEvmLogin(provider, addr);
      await verifyWalletWithSupabase(proof);
    } catch { /* non-fatal */ }
    const notifText = type === "solana" ? "PHANTOM CONNECTED!" : "METAMASK CONNECTED!";
    stateRef.current.notification = { text: notifText, life: 120 };
    triggerPopup(notifText);
    if (type === "solana") {
      const hasAlpha = await checkSolanaNFT(addr);
      const boost = applyNFTBoostsToState(hasAlpha);
      stateRef.current.farmingSpeedMultiplier = boost.farmingSpeedMultiplier;
      stateRef.current.nftBoostActive = boost.nftBoostActive;
      if (hasAlpha) {
        const boostText = "ALPHA NFT — FARM SPEED BOOST!";
        stateRef.current.notification = { text: boostText, life: 140 };
        triggerPopup(boostText);
      }
    }
    setDs({ ...stateRef.current });
    await saveProgress();
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress("");
    setWalletType(null);
    localStorage.removeItem("wallet_addr");
    localStorage.removeItem("wallet_type");
    stateRef.current.player.walletAddress = "";
  };

  // ── Persistence ───────────────────────────────────────────────────────────
  const loadProgress = async (addr: string) => {
    try {
      const applyRow = (data: Record<string, unknown> | null): boolean => {
        if (!data) return false;
        const { gold, exp, level } = data;
        if (typeof gold !== "number" || typeof exp !== "number" || typeof level !== "number") return false;
        stateRef.current.player.gold = gold;
        stateRef.current.player.exp = exp;
        stateRef.current.player.level = level;
        stateRef.current.player.maxExp = typeof data.max_exp === "number" ? data.max_exp : stateRef.current.player.maxExp;
        stateRef.current.player.inventory = (data.inventory as GameState["player"]["inventory"]) || stateRef.current.player.inventory;
        stateRef.current.player.nftEligibility = !!data.nft_eligibility;
        if (data.nfts && Array.isArray(data.nfts)) setNfts(data.nfts as string[]);
        applyStoredQuestClaims(stateRef.current, addr);
        lastServerEconomyRef.current = snapshotEconomy(stateRef.current.player);
        setDs({ ...stateRef.current });
        return true;
      };
      // Try localStorage buffer first (mobile battery saving)
      const cached = localStorage.getItem(`progress_${addr}`);
      if (cached) {
        try { applyRow(JSON.parse(cached)); } catch { /* ignore */ }
      }
      const u = await supabase.from("users").select("*").eq("wallet_address", addr).maybeSingle();
      let loaded = applyRow(u.data);
      if (!loaded) {
        const p = await supabase.from("players").select("*").eq("wallet_address", addr).maybeSingle();
        loaded = applyRow(p.data);
      }
      if (!loaded) applyStoredQuestClaims(stateRef.current, addr);
      setInitialLoadComplete(true);
    } catch (e) {
      console.warn("[Persistence] Load error:", e);
      setInitialLoadComplete(true);
    }
  };

  const saveProgress = async () => {
    const addr = stateRef.current.player.walletAddress;
    if (!addr || addr.toLowerCase().startsWith("guest") || !initialLoadCompleteRef.current) return;
    const payload = {
      wallet_address: addr,
      gold: stateRef.current.player.gold,
      exp: stateRef.current.player.exp,
      level: stateRef.current.player.level,
      max_exp: stateRef.current.player.maxExp,
      inventory: stateRef.current.player.inventory,
      nfts: nftsRef.current,
      farm_plots: stateRef.current.farmPlots.map((p) => ({ plot_id: p.plotUuid, grid_x: p.gridX, grid_y: p.gridY })),
      last_seen: new Date().toISOString(),
    };
    // Always write to localStorage buffer first (instant, battery-friendly)
    localStorage.setItem(`progress_${addr}`, JSON.stringify(payload));
    try {
      const [pa, ua] = await Promise.all([
        supabase.from("players").upsert(payload, { onConflict: "wallet_address" }),
        supabase.from("users").upsert(payload, { onConflict: "wallet_address" }),
      ]);
      if (pa.error) throw pa.error;
      lastServerEconomyRef.current = snapshotEconomy(stateRef.current.player);
    } catch (e) {
      console.error("[Persistence] Save error (Gold persisted locally):", e);
      // Removed: Restoring snap.gold here causes "stuck gold" bugs when sync fails.
      // We rely on local state being canonical and cloud catch-up later.
      stateRef.current.notification = { text: "CLOUD SYNC DELAYED — PROGRESS SAVED LOCALLY", life: 100 };
      setDs({ ...stateRef.current });
    } finally {
      stateRef.current.pendingCloudSave = false;
    }
  };

  useEffect(() => {
    const timer = setInterval(saveProgress, 30000);
    return () => clearInterval(timer);
  }, [nfts]);

  // Auto-restore wallet from localStorage
  useEffect(() => {
    const addr = localStorage.getItem("wallet_addr");
    const type = localStorage.getItem("wallet_type");
    if (addr) {
      setWalletAddress(addr);
      setWalletType(type === "solana" ? "solana" : "evm");
      setWalletConnected(true);
      stateRef.current.player.walletAddress = addr;
      setInitialLoadComplete(false);
      loadProgress(addr).then(() => setDs({ ...stateRef.current }));
    }
  }, []);

  // ── Map ambient audio ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!splashDone || !introTutorialDone) return;
    if (ds.currentMap === "suburban") { AudioManager.init(); AudioManager.setMapAmbient("suburban_birds"); }
    else AudioManager.setMapAmbient("none");
  }, [ds.currentMap, splashDone, introTutorialDone]);

  // ── Garden presence ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!splashDone || !introTutorialDone || ds.currentMap !== "garden") return;
    let cancelled = false;
    const pull = async () => {
      try {
        const { count, error } = await supabase.from("sessions").select("*", { count: "exact", head: true });
        if (!cancelled && !error && count != null) { stateRef.current.gardenActivePlayers = count; setDs({ ...stateRef.current }); }
      } catch { if (!cancelled) stateRef.current.gardenActivePlayers = 0; }
    };
    pull();
    const t = setInterval(pull, 12000);
    return () => { cancelled = true; clearInterval(t); };
  }, [ds.currentMap, splashDone, introTutorialDone]);

  useEffect(() => {
    if (!splashDone || !introTutorialDone || ds.currentMap !== "garden") return;
    const addr = walletAddress || stateRef.current.player.walletAddress || guestId;
    if (!addr) return;
    const channel = supabase.channel("garden-live", { config: { presence: { key: addr } } });
    const pushPresence = () => void channel.track({
      x: stateRef.current.player.x,
      y: stateRef.current.player.y,
      emote: stateRef.current.player.emote,
      at: Date.now()
    });
    channel.subscribe(async (status) => { if (status === "SUBSCRIBED") pushPresence(); });
    const flushOthers = () => {
      const st = channel.presenceState() as Record<string, Array<{ x?: number; y?: number; emote?: string }>>;
      const others: { id: string; x: number; y: number; emote?: any }[] = [];
      for (const [key, entries] of Object.entries(st)) {
        if (key === addr) continue;
        const v = entries?.[0];
        if (v && typeof v.x === "number" && typeof v.y === "number") {
          others.push({ id: key.slice(0, 12), x: v.x, y: v.y, emote: v.emote });
        }
      }
      stateRef.current.gardenRemotePlayers = others;
    };
    channel.on("presence", { event: "sync" }, flushOthers);
    channel.on("presence", { event: "join" }, flushOthers);
    channel.on("presence", { event: "leave" }, flushOthers);
    const iv = setInterval(pushPresence, 450);
    return () => { clearInterval(iv); void channel.unsubscribe(); };
  }, [ds.currentMap, splashDone, introTutorialDone, walletAddress]);

  // ── NFT claim ─────────────────────────────────────────────────────────────
  const claimNFT = async () => {
    const addr = walletAddress || localStorage.getItem("wallet_addr");
    if (!addr) { stateRef.current.notification = { text: "CONNECT WALLET FIRST!", life: 120 }; setDs({ ...stateRef.current }); return; }
    stateRef.current.notification = { text: "CLAIMING TOKEN...", life: 300 };
    setDs({ ...stateRef.current });
    const result = await transferTokenToUser(addr, 10);
    if (result.success) {
      const newNft = `ALPHA NFT #${nfts.length + 1} | ID: ${result.txid?.slice(0, 6)}`;
      const updatedNfts = [...nfts, newNft];
      setNfts(updatedNfts);
      
      const onChainBalance = await getTokenBalance(addr);
      stateRef.current.player.lifetopiaGold = onChainBalance;
      stateRef.current.player.nftEligibility = false; // Claimed
      
      const claimText = "ALPHA NFT CLAIMED!";
      stateRef.current.notification = { text: claimText, life: 3500 };
      triggerPopup(claimText);
      setDs({ ...stateRef.current });

      try {
        await supabase.from("players").update({ 
          nfts: updatedNfts, 
          nft_eligibility: false,
          gold: stateRef.current.player.gold 
        }).eq("wallet_address", addr);
      } catch { /* non-fatal sync */ }
    } else {
      stateRef.current.notification = { text: result.error?.slice(0, 40).toUpperCase() || "CLAIM FAILED", life: 150 };
      setDs({ ...stateRef.current });
    }
  };

  // ── Keyboard input ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Block all input during demo
      if (stateRef.current.demoMode) return;
      const key = e.key.toLowerCase();
      stateRef.current.keys.add(key);
      if (!introTutorialDone) {
        if (key === "escape") setActivePanel(null);
        if (key === "f2") { stateRef.current.showFarmDebugOverlay = !stateRef.current.showFarmDebugOverlay; setDs({ ...stateRef.current }); e.preventDefault(); return; }
        const consumed = ["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"," ","e","enter","tab","f2","k"];
        if (consumed.includes(key)) e.preventDefault();
        return;
      }
      if (key === " " || key === "e" || key === "enter") {
        if (stateRef.current.currentMap === "city") setActivePanel("shop");
        else stateRef.current = handleToolAction(stateRef.current);
      }
      if (key === "escape") setActivePanel(null);
      if (key === "tab") {
        const order: MapType[] = ["home","city","fishing","garden","suburban"];
        const next = order[(order.indexOf(stateRef.current.currentMap) + 1) % 5];
        doSwitchMap(next);
      }
      if (key === "shift") stateRef.current.player.running = true;
      let n = parseInt(e.key);
      if (e.key === "0") n = 10;
      if (n >= 1 && n <= TOOL_IDS.length) {
        if (stateRef.current.currentMap === "garden" && n >= 1 && n <= 4) {
          const emotes = ["wave","dance","sit","laugh"] as const;
          stateRef.current.player.emote = emotes[n - 1];
          stateRef.current.player.emoteUntil = stateRef.current.time + 2800;
        } else {
          stateRef.current.player.tool = TOOL_IDS[n - 1] as any;
        }
        setDs({ ...stateRef.current });
      }
      if (key === "f2") { stateRef.current.showFarmDebugOverlay = !stateRef.current.showFarmDebugOverlay; setDs({ ...stateRef.current }); e.preventDefault(); return; }
      const consumed = ["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"," ","e","enter","tab","f2"];
      if (consumed.includes(key)) e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys.delete(e.key.toLowerCase());
      if (e.key === "Shift") stateRef.current.player.running = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  }, [doSwitchMap, introTutorialDone]);

  // ── Mobile quadrant controller ────────────────────────────────────────────
  const handleMobileDirChange = useCallback((keys: string[], active: boolean) => {
    if (active) {
      keys.forEach(k => stateRef.current.keys.add(k));
    } else {
      keys.forEach(k => stateRef.current.keys.delete(k));
    }
  }, []);

  // ── Game loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loaded) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true; // HD rendering — no more "pecah grafik"

    const loop = (ts: number) => {
      const dt = Math.min(ts - (lastTimeRef.current || ts) || 16, 32);
      lastTimeRef.current = ts;

      // Guard FARM_GRID integrity
      if (FARM_GRID.cols !== 3 || FARM_GRID.rows !== 2 || FARM_GRID.cellW !== 83 || FARM_GRID.cellH !== 68 || FARM_GRID.startX !== 197 || FARM_GRID.startY !== 259) {
        (FARM_GRID as any).cols = 3; (FARM_GRID as any).rows = 2;
        (FARM_GRID as any).cellW = 83; (FARM_GRID as any).cellH = 68;
        (FARM_GRID as any).startX = 197; (FARM_GRID as any).startY = 259;
      }
      if (stateRef.current.farmPlots.length !== 6) {
        const plots: any[] = [];
        for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
          const existing = stateRef.current.farmPlots.find(p => p.gridX === c && p.gridY === r);
          const uid = globalThis.crypto?.randomUUID?.() ?? `plot-${Date.now()}-${c}-${r}`;
          plots.push(existing ? { ...existing, plotUuid: existing.plotUuid ?? uid, stressDrySince: existing.stressDrySince ?? null }
            : { id: `plot-${r}-${c}`, plotUuid: uid, gridX: c, gridY: r, worldX: 197 + c * 83, worldY: 259 + r * 68, tilled: false, watered: false, fertilized: false, crop: null, stressDrySince: null });
        }
        stateRef.current.farmPlots = plots;
      }

      const prevNotif = stateRef.current.notification?.text;
      stateRef.current = updateGame(stateRef.current, dt);
      const newNotif = stateRef.current.notification?.text;
      if (newNotif && newNotif !== prevNotif) triggerPopup(newNotif);

      if (stateRef.current.pendingCloudSave && initialLoadCompleteRef.current && !cloudSaveBusy.current) {
        cloudSaveBusy.current = true;
        void saveProgress().finally(() => { cloudSaveBusy.current = false; });
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      renderGame(ctx, stateRef.current, canvas.width, canvas.height);

      if (stateRef.current.activePanel !== activePanel) setActivePanel(stateRef.current.activePanel);
      // ── LOOP PERFORMANCE: Update UI at 15fps instead of 8fps for smoother feedback ──
      if (Math.floor(ts / 66) !== Math.floor((ts - dt) / 66)) {
        setDs({ ...stateRef.current });
      }
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [loaded]);

  // ── Tool selection ────────────────────────────────────────────────────────
  const selectTool = (toolId: string) => {
    AudioManager.playSFX("click");
    const cropGate = toolIdToCrop(toolId);
    if (cropGate && !isCropPlantingUnlocked(cropGate, stateRef.current.player.level, stateRef.current.farmBalancePreset)) {
      const need = seedUnlockLevel(cropGate, stateRef.current.farmBalancePreset);
      stateRef.current.notification = { text: `LOCKED — UNLOCKS AT LVL ${need}`, life: 120 };
      setDs({ ...stateRef.current });
      return;
    }
    stateRef.current.player.tool = toolId as any;
    const s = stateRef.current.player;
    if (s.tutorialStep === 1 && toolId === "sickle") s.tutorialStep = 2;
    if (s.tutorialStep === 3 && toolId === "fertilizer") s.tutorialStep = 4;
    if (s.tutorialStep === 5 && toolId.includes("wheat-seed")) s.tutorialStep = 6;
    if (s.tutorialStep === 7 && toolId === "water") s.tutorialStep = 8;
    if (s.tutorialStep === 9 && toolId === "sickle") s.tutorialStep = 10;
    setDs({ ...stateRef.current });
  };

  const applyBalancePreset = (preset: FarmBalancePreset) => {
    stateRef.current.farmBalancePreset = preset;
    applyFarmBalancePreset(preset);
    stateRef.current.notification = { text: `BALANCE PRESET: ${preset.toUpperCase()}`, life: 120 };
    setDs({ ...stateRef.current });
  };

  // ── Farm Boost (limited uses — speeds up all growing crops by 30%) ────────
  const useFarmBoost = () => {
    const s = stateRef.current;
    if (s.currentMap === "fishing" && s.player.y > 550) {
      s.notification = { text: "WALK TO THE WATER EDGE!", life: 60 };
      setDs({ ...s }); return;
    }
    if (boostCharges <= 0) {
      stateRef.current.notification = { text: "NO BOOST CHARGES LEFT!", life: 100 };
      setDs({ ...stateRef.current }); return;
    }
    const hasGrowing = stateRef.current.farmPlots.some(p => p.crop && !p.crop.ready && !p.crop.dead);
    if (!hasGrowing) {
      stateRef.current.notification = { text: "NO GROWING CROPS TO BOOST!", life: 100 };
      setDs({ ...stateRef.current }); return;
    }
    // Advance all growing crops by 30% of their remaining grow time
    stateRef.current.farmPlots = stateRef.current.farmPlots.map(p => {
      if (!p.crop || p.crop.ready || p.crop.dead) return p;
      const gt = Math.max(1, p.crop.growTime || 20000);
      const boost = gt * 0.30;
      return { ...p, crop: { ...p.crop, plantedAt: p.crop.plantedAt - boost } };
    });
    setBoostCharges(c => c - 1);
    AudioManager.playSFX("harvest");
    const boostText = `BOOST APPLIED! ${boostCharges - 1} CHARGES LEFT`;
    stateRef.current.notification = { text: boostText, life: 120 };
    triggerPopup(boostText);
    setDs({ ...stateRef.current });
  };

  const onWheel = (e: React.WheelEvent) => {
    stateRef.current.targetZoom = Math.max(0.8, Math.min(3, stateRef.current.targetZoom + (e.deltaY > 0 ? -0.2 : 0.2)));
    e.preventDefault();
  };

  // ── Canvas click / touch ──────────────────────────────────────────────────
  const onClick = (e: React.MouseEvent) => {
    if (activePanel) return;
    if (stateRef.current.demoMode) return;
    
    const s = stateRef.current;
    if (s.fishingSession) {
      handleFishingAction(s);
      setDs({ ...s });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    const ps = s.player;
    const oldStep = ps.tutorialStep;
    stateRef.current = handleToolAction(stateRef.current, mx, my);
    if (oldStep === 2 && stateRef.current.farmPlots.some(p => p.tilled)) ps.tutorialStep = 3;
    if (oldStep === 4 && stateRef.current.farmPlots.some(p => p.fertilized)) ps.tutorialStep = 5;
    if (oldStep === 6 && stateRef.current.farmPlots.some(p => p.crop)) ps.tutorialStep = 7;
    if (oldStep === 8 && stateRef.current.farmPlots.some(p => p.watered)) ps.tutorialStep = 9;
    setDs({ ...stateRef.current });
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (activePanel) return;
    if (stateRef.current.demoMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const my = (touch.clientY - rect.top) * (canvas.height / rect.height);
    
    const s = stateRef.current;
    if (s.fishingSession) {
      handleFishingAction(s);
      setDs({ ...s });
      return;
    }

    const oldStep = s.player.tutorialStep;
    stateRef.current = handleToolAction(stateRef.current, mx, my);
    if (oldStep === 2 && stateRef.current.farmPlots.some(p => p.tilled)) s.player.tutorialStep = 3;
    if (oldStep === 4 && stateRef.current.farmPlots.some(p => p.fertilized)) s.player.tutorialStep = 5;
    if (oldStep === 6 && stateRef.current.farmPlots.some(p => p.crop)) s.player.tutorialStep = 7;
    if (oldStep === 8 && stateRef.current.farmPlots.some(p => p.watered)) s.player.tutorialStep = 9;
    setDs({ ...stateRef.current });
  };


  // ── Shop buy ──────────────────────────────────────────────────────────────
  const buyItem = (id: string, price: number, e?: React.MouseEvent) => {
    const s = stateRef.current;
    const effPrice = id.endsWith("-seed") ? getShopSeedPrice(id, price, s.farmBalancePreset) : price;
    const crop = id.endsWith("-seed") ? toolIdToCrop(id) : null;
    if (crop && !isCropPlantingUnlocked(crop, s.player.level, s.farmBalancePreset)) {
      const need = seedUnlockLevel(crop, s.farmBalancePreset);
      stateRef.current.notification = { text: `SEED LOCKED — LVL ${need}`, life: 90 };
      setDs({ ...stateRef.current }); return;
    }
    if (s.player.gold < effPrice) {
      stateRef.current.notification = { text: "NOT ENOUGH GOLD!", life: 80 };
      setDs({ ...stateRef.current }); return;
    }
    AudioManager.playSFX("buy");
    stateRef.current.player = { ...s.player, gold: s.player.gold - effPrice, inventory: { ...s.player.inventory, [id]: (s.player.inventory[id] || 0) + 1 } };
    stateRef.current.pendingCloudSave = true;
    spawnText(stateRef.current, s.player.x, s.player.y - 40, `-${effPrice}G`, "#FF8888");
    if (e && gameRootRef.current && goldHudRef.current && e.currentTarget instanceof HTMLElement) {
      const root = gameRootRef.current.getBoundingClientRect();
      const br = e.currentTarget.getBoundingClientRect();
      const gr = goldHudRef.current.getBoundingClientRect();
      const burstId = Date.now() + Math.random();
      setCoinBursts(prev => [...prev, { id: burstId, sx: br.left + br.width / 2 - root.left, sy: br.top + br.height / 2 - root.top, tx: gr.left + gr.width / 2 - root.left, ty: gr.top + gr.height / 2 - root.top }]);
      window.setTimeout(() => setCoinBursts(prev => prev.filter(b => b.id !== burstId)), 750);
    }
    setDs({ ...stateRef.current });
  };

  const hpPct = ds.player.hp / ds.player.maxHp;
  const claimableQuests = splashDone && introTutorialDone ? getClaimableQuests(ds) : [];
  const farmGuide = ds.currentMap === "home" ? getFarmStatusGuide(ds.farmPlots, ds.player.tool) : null;

  // ── Map context hints ─────────────────────────────────────────────────────
  const MAP_REASON: Record<string, string> = {
    city:     "BUY SEEDS + SUPPLIES — WALK TO A SHOP SIGN AND PRESS E",
    fishing:  "EARN GOLD WHILE CROPS GROW — CLICK WATER TO CAST LINE",
    garden:   "SOCIAL HUB — MEET OTHER PLAYERS AND CHILL",
    suburban: "EXPLORE THE NEIGHBORHOOD — MORE CONTENT COMING SOON",
  };
  const mapHint = splashDone && introTutorialDone && ds.currentMap !== "home"
    ? MAP_REASON[ds.currentMap] ?? null : null;

  const containerStyle: React.CSSProperties = isMobile ? {
    position: "relative",
    width: "100dvw",
    height: "100dvh",
    overflow: "hidden",
    background: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } : {
    position: "relative",
    width: 1280,
    height: 720,
    overflow: "hidden",
    background: "#000",
    margin: "0 auto",
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div ref={gameRootRef} style={containerStyle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        .gf { font-family: 'Press Start 2P', 'Courier New', monospace; }
        * { -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
        .wood-panel {
          background: linear-gradient(180deg, #CE9E64 0%, #8D5A32 100%);
          border: 4px solid #5C4033; border-radius: 16px;
          box-shadow: 0 12px 30px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.3);
          position: relative;
        }
        .gold-header { background: #5C4033; border-radius: 10px 10px 0 0; padding: 10px 12px; color: #FFD700; text-shadow: 1px 1px #000; font-size: 10px; letter-spacing: 1px; }
        .wb {
          font-family: 'Press Start 2P', 'Courier New', monospace;
          background: linear-gradient(180deg, #CE9E64 0%, #8D5A32 100%);
          border: 3px solid #5C4033; border-radius: 999px; color: #FFF5E0; cursor: pointer;
          box-shadow: 0 4px 0 #3a2212, inset 0 1px 1px rgba(255,255,255,0.45);
          transition: all 0.08s ease; padding: 8px 14px; font-size: 8px; text-shadow: 1px 1px 1px #000;
          touch-action: manipulation;
        }
        .wb:hover { background: linear-gradient(180deg, #D9B380 0%, #AD7D54 100%); transform: translateY(-2px); box-shadow: 0 6px 0 #3a2212; }
        .wb:active { transform: translateY(2px); box-shadow: 0 2px 0 #3a2212; }
        .wb.active { background: linear-gradient(180deg, #FFD700 0%, #C8A020 100%); color: #3E2723; box-shadow: 0 0 15px rgba(255,215,0,0.5); text-shadow: none; }
        .tray { background: linear-gradient(180deg, #A07844 0%, #7B502C 100%); padding: 12px 20px; border-radius: 50px; border: 4px solid #5C4033; box-shadow: 0 10px 0 rgba(0,0,0,0.5), inset 0 2px 8px rgba(255,255,255,0.25); display: flex; gap: 8px; }
        .slot { width: 58px; height: 58px; background: linear-gradient(135deg, #8B5E3C 0%, #5E3A24 100%); border: 3px solid #4D2D18; border-radius: 50%; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; transition: all 0.1s; box-shadow: inset 0 0 10px rgba(0,0,0,0.7), 0 3px 6px rgba(0,0,0,0.3); touch-action: manipulation; }
        .slot:hover { transform: translateY(-5px) scale(1.05); border-color: #FFD700; box-shadow: 0 5px 15px rgba(255,215,0,0.3); }
        .slot.active-tool { background: linear-gradient(135deg, #FFE4B5 0%, #D4AF37 100%); border-color: #FFF; box-shadow: 0 0 20px rgba(255,215,0,0.6), inset 0 0 5px #FFF; }
        .tool-img { width: 40px; height: 40px; object-fit: contain; filter: drop-shadow(2px 4px 4px rgba(0,0,0,0.6)); transition: transform 0.2s; }
        .slot-key { position: absolute; top: 6px; left: 50%; transform: translateX(-50%); font-size: 5px; color: #FFD700; font-weight: bold; text-shadow: 1px 1.5px 1px #000; }
        .logo-container { position: absolute; top: 15px; left: 15px; z-index: 2000; overflow: hidden; cursor: pointer; border-radius: 20px; }
        .logo-img { height: 150px; object-fit: contain; filter: drop-shadow(4px 0 0 #FFF) drop-shadow(-4px 0 0 #FFF) drop-shadow(0 4px 0 #FFF) drop-shadow(0 -4px 0 #FFF) drop-shadow(0 20px 20px rgba(0,0,0,0.6)); }
        .logo-container::after { content: ""; position: absolute; top: -50%; left: -60%; width: 25%; height: 200%; background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%); transform: rotate(30deg); animation: shine 4s infinite linear; }
        @keyframes shine { 0% { left: -100%; } 30% { left: 150%; } 100% { left: 150%; } }
        @keyframes coinFlyToHud { from { transform: translate(0,0) scale(1); opacity: 1; } to { transform: translate(var(--cdx), var(--cdy)) scale(0.25); opacity: 0; } }
        @keyframes toolGlow { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.8); } 50% { box-shadow: 0 0 25px 15px rgba(255,255,255,0.5); } 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.8); } }
        .glowing-tool { animation: toolGlow 1.5s infinite; z-index: 10000; border-radius: 50%; }
        @keyframes farmStatusPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }
        .farm-status-bar { animation: farmStatusPulse 3s infinite; }
        .shop-scroll-area::-webkit-scrollbar { width: 10px; }
        .shop-scroll-area::-webkit-scrollbar-track { background: #5C4033; border-radius: 10px; }
        .shop-scroll-area::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #D4AF37 0%, #8B5E3C 100%); border: 2px solid #5C4033; border-radius: 10px; }
      `}</style>

      {/* ── LOGO ── */}
      {splashDone && (walletConnected || walletAddress.toLowerCase().startsWith("guest")) && !isMobile && (
        <div className="logo-container"><img src="/logo.png" alt="LIFETOPIA" className="logo-img" /></div>
      )}

      {/* ── COIN BURST ANIMATION ── */}
      {coinBursts.map((b) => (
        <div key={b.id} style={{ position: "absolute", left: b.sx, top: b.sy, width: 10, height: 10, marginLeft: -5, marginTop: -5, borderRadius: 2, background: "#FFD700", boxShadow: "0 0 6px #FFF8", pointerEvents: "none", zIndex: 2500, ["--cdx" as string]: `${b.tx - b.sx}px`, ["--cdy" as string]: `${b.ty - b.sy}px`, animation: "coinFlyToHud 0.65s ease-out forwards" }} />
      ))}

      {/* ── CANVAS ── */}
      {/* ── CINEMATIC DEMO OVERLAY (Letterbox) ── */}

      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        onClick={onClick}
        onMouseMove={(e) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          stateRef.current.pointerCanvas = { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
        }}
        onMouseLeave={() => { stateRef.current.pointerCanvas = null; stateRef.current.plotHoverFromPointer = null; }}
        onWheel={onWheel}
        onTouchEnd={onTouchEnd}
        style={{ display: "block", width: isMobile ? "auto" : "100%", height: isMobile ? "auto" : "100%", maxWidth: "100%", maxHeight: "100%", objectFit: "contain", cursor: "crosshair", touchAction: "none", imageRendering: "pixelated" }}
      />

      {/* ── MOBILE QUADRANT CONTROLLER ── */}
      {isMobile && splashDone && introTutorialDone && !activePanel && (
        <QuadrantController onDirChange={handleMobileDirChange} disabled={!!activePanel} />
      )}

      {/* ── ACTION POPUP ── */}
      <ActionPopup popup={actionPopup} onDone={() => setActionPopup(null)} />

      {/* ── SPLASH ── */}
      {!splashDone && <SplashScreen onSelectMap={handleSplashSelect} />}

      {/* ── WALLET LOGIN SCREEN ── */}
      {splashDone && !walletConnected && (
        <div style={{ position: "absolute", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(18px)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 30, textAlign: "center", padding: "env(safe-area-inset-top,0) 24px env(safe-area-inset-bottom,0)" }}>
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(32px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            .wallet-container { animation: slideUp 0.6s cubic-bezier(0.2,0.8,0.2,1) forwards; display: flex; flex-direction: column; align-items: center; width: min(480px, 94vw); }
          `}</style>
          <div className="wallet-container">
            <img src="/logo.png" style={{ height: 140, marginBottom: 32, filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.6))", display: "block", margin: "0 auto" }} alt="Logo" />
            <div className="gf" style={{ fontSize: 9, color: "#FFFFFF", marginBottom: 36, lineHeight: 1.8, textShadow: "1px 1.5px 0 #000", maxWidth: 360 }}>
              CONNECT YOUR WALLET TO ENTER LIFETOPIA WORLD
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
              <button className="wb gf" onClick={() => { connectPhantom(); AudioManager.playSFX("click"); }} style={{ fontSize: 12, padding: "20px", background: "linear-gradient(180deg, #CE9E64 0%, #8D5A32 100%)", border: "3px solid #FFFFFF" }}>
                {phantomFound ? "CONNECT PHANTOM" : isMobile ? "OPEN PHANTOM APP" : "INSTALL PHANTOM"}
              </button>
              <button className="wb gf" onClick={() => { connectMetaMask(); AudioManager.playSFX("click"); }} style={{ fontSize: 11, padding: "18px", background: "linear-gradient(180deg, #CE9E64 0%, #8D5A32 100%)", border: "3px solid #5C4033" }}>
                CONNECT METAMASK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRE-FARM TUTORIAL ── */}
      {splashDone && !introTutorialDone && (
        <PreFarmTutorial visible={true} onFinished={handlePreFarmTutorialFinished} onMapFocus={handlePreFarmMapFocus} />
      )}

      {/* ── MOBILE HUD (replaces desktop HUD on mobile) ── */}
      {isMobile && splashDone && introTutorialDone && (
        <MobileHUD
          ds={ds}
          tools={TOOLS}
          onSelectTool={selectTool}
          onOpenInventory={() => {}}
          onOpenMap={doSwitchMap}
          currentMap={ds.currentMap}
          maps={MAPS}
          gold={ds.player.gold}
          level={ds.player.level}
          onOpenPanel={setActivePanel}
          claimableCount={claimableQuests.length}
          boostCharges={boostCharges}
          onBoost={useFarmBoost}
        />
      )}

      {/* ── DESKTOP TOP NAV ── */}
      {!isMobile && splashDone && introTutorialDone && (
        <div style={{ position: "absolute", top: 20, right: 20, display: "flex", gap: 8, alignItems: "center" }}>
          <div className="wb gf" style={{ color: "#FFFFFF", padding: "6px 15px", pointerEvents: "none" }}>LVL {ds.player.level}</div>
              <button className="wb gf" onClick={() => { setActivePanel("wallet"); AudioManager.playSFX("click"); }}>WALLET</button>
              <button className="wb gf" onClick={() => { setActivePanel("quests"); AudioManager.playSFX("click"); }} style={{ position: "relative" }}>
                TASKS
                {claimableQuests.length > 0 && <span style={{ position: "absolute", top: -6, right: -4, color: "#FFFFFF", fontSize: 14, lineHeight: 1, fontWeight: "bold", textShadow: "0 0 4px #000" }}>!</span>}
              </button>
              <button className="wb gf" onClick={() => { setActivePanel("inventory"); AudioManager.playSFX("click"); }}>ITEMS</button>
              <button className="wb gf" onClick={() => { setActivePanel("nft"); AudioManager.playSFX("click"); }}>MY NFTS</button>
          <div ref={goldHudRef} className="wb gf" style={{ color: "#FFD700", padding: "8px 20px", fontSize: 13, border: "2px solid #FFD700", boxShadow: "0 0 10px rgba(255,215,0,0.4)", pointerEvents: "none" }}>GOLD {ds.player.gold}</div>
          <div className="wb gf" style={{ color: "#FFFFFF", padding: "6px 12px", pointerEvents: "none" }}>{ds.player.lifetopiaGold} LFG</div>
          <button className="wb gf" style={{ fontSize: 10, padding: "6px 10px" }} onClick={() => { setActivePanel("settings"); AudioManager.playSFX("click"); }}>SET</button>
          {ds.nftBoostActive && <div className="wb gf" style={{ color: "#FFFFFF", padding: "6px 12px", pointerEvents: "none", fontSize: 6, borderColor: "#5C4033", background: "linear-gradient(180deg,#CE9E64 0%,#8D5A32 100%)" }}>BOOST ACTIVE</div>}
        </div>
      )}

      {/* ── FARM STATUS BAR (super clear step-by-step guidance) ── */}
      {splashDone && introTutorialDone && ds.currentMap === "home" && farmGuide && (
        <div style={{ position: "absolute", top: isMobile ? 56 : 70, left: "50%", transform: "translateX(-50%)", zIndex: 1100, pointerEvents: "none", maxWidth: isMobile ? "94vw" : 1000 }}>
          <div style={{
            background: "linear-gradient(180deg, #A07844 0%, #7B502C 100%)",
            border: "3px solid #5C4033",
            borderRadius: 999,
            padding: "8px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 6px 0 rgba(0,0,0,0.5), inset 0 2px 6px rgba(255,255,255,0.2)",
          }}>
            {/* Slot badge — shows which key to press */}
            {farmGuide.slot !== null && (
              <div style={{
                background: "linear-gradient(180deg, #CE9E64 0%, #8D5A32 100%)",
                border: "2px solid #5C4033",
                borderRadius: "50%",
                width: 28, height: 28,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 0 8px rgba(255,255,255,0.2), 0 3px 0 #7a5c00",
              }}>
                <span className="gf" style={{ fontSize: 9, color: "#FFFFFF", fontWeight: "bold" }}>{farmGuide.slot}</span>
              </div>
            )}
            {/* Instruction text */}
            <span className="gf" style={{
              fontSize: isMobile ? 6 : 7,
              color: "#FFFFFF",
              textShadow: "1px 1px 0 #000",
              letterSpacing: "0.04em",
              lineHeight: 1.5,
              whiteSpace: isMobile ? "normal" : "nowrap",
            }}>
              {farmGuide.action}
            </span>
          </div>
        </div>
      )}

      {/* ── MAP CONTEXT HINT (non-farm maps) ── */}
      {mapHint && (
        <div style={{ position: "absolute", top: isMobile ? 56 : 70, left: "50%", transform: "translateX(-50%)", zIndex: 1100, pointerEvents: "none", maxWidth: isMobile ? "90vw" : 800 }}>
          <div className="gf" style={{
            background: "linear-gradient(180deg, #A07844 0%, #7B502C 100%)",
            border: "3px solid #5C4033",
            borderRadius: 999,
            padding: "7px 22px",
            fontSize: isMobile ? 6 : 7,
            color: "#FFFFFF",
            textAlign: "center",
            lineHeight: 1.6,
            boxShadow: "0 6px 0 rgba(0,0,0,0.5), inset 0 2px 6px rgba(255,255,255,0.2)",
            textShadow: "1px 1px 0 #000",
            whiteSpace: isMobile ? "normal" : "nowrap",
            letterSpacing: "0.04em",
          }}>
            {mapHint}
          </div>
        </div>
      )}

      {/* ── DESKTOP TOOL TRAY + BOOST BUTTON ── */}
      {!isMobile && splashDone && introTutorialDone && (
        <div style={{ position: "absolute", bottom: 100, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          {ds.currentMap === "home" && (
            <>
              <div className="tray">
                {TOOLS.map((t, i) => {
                  const slotNum = i + 1;
                  const isActive = ds.player.tool === t.id;
                  const isGuideTarget = farmGuide?.slot === slotNum;
                  const matchesStep = tutorialActive && ((tutStep === 1 && t.id === "sickle") || (tutStep === 2 && (t.id === "wheat-seed" || t.id.includes("seed"))) || (tutStep === 3 && t.id === "water") || (tutStep === 4 && (t.id === "axe" || t.id === "axe-large")));
                  return (
                    <div key={t.id} className={`slot ${isActive ? "active-tool" : ""} ${matchesStep || isGuideTarget ? "glowing-tool" : ""}`} onClick={() => { selectTool(t.id); AudioManager.playSFX("click"); }}
                      style={{ position: "relative" }}>
                      {/* Slot number badge */}
                      <div style={{
                        position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                        background: isGuideTarget
                          ? "linear-gradient(180deg, #CE9E64 0%, #8D5A32 100%)"
                          : isActive
                            ? "linear-gradient(180deg, #FFFFFF 0%, #CCCCCC 100%)"
                            : "linear-gradient(180deg, #CE9E64 0%, #8D5A32 100%)",
                        border: `2px solid ${isGuideTarget ? "#FFFFFF" : "#5C4033"}`,
                        borderRadius: "50%",
                        width: 20, height: 20,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: isGuideTarget ? "0 0 8px rgba(255,255,255,0.8)" : "0 2px 0 #3a2212",
                        zIndex: 10,
                        animation: isGuideTarget ? "toolGlow 1s infinite" : "none",
                      }}>
                        <span className="gf" style={{ fontSize: 6, color: isGuideTarget ? "#FFFFFF" : isActive ? "#3E2723" : "#FFFFFF", fontWeight: "bold" }}>{slotNum}</span>
                      </div>
                      <div style={{ width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img src={t.img} style={{ width: 44, height: 44, opacity: isActive ? 1 : 0.8 }} alt={t.label} />
                      </div>
                      
                      {/* SEED COUNT BADGE */}
                      {t.id.endsWith("-seed") && (
                        <div style={{
                          position: "absolute", bottom: -5, right: -5,
                          background: (ds.player.inventory[t.id] || 0) > 0 ? "#4CAF50" : "#F44336",
                          border: "2px solid #5C4033", borderRadius: "50%",
                          width: 18, height: 18, fontSize: 8,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#FFF", fontWeight: "bold", zIndex: 5
                        }}>
                          {ds.player.inventory[t.id] || 0}
                        </div>
                      )}
                      
                      {/* Seed Cooldown Timer Overlay */}
                      {(ds.seedCooldowns[t.id] || 0) > 0 && (
                        <div style={{
                          position: "absolute", inset: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: "rgba(0,0,0,0.4)", borderRadius: "50%",
                          fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: "#FFFFFF",
                          textShadow: "1px 1px 2px #000"
                        }}>
                          {Math.ceil(ds.seedCooldowns[t.id] / 1000)}s
                        </div>
                      )}

                      {/* Tool label below */}
                      <div className="gf" style={{ position: "absolute", bottom: -16, left: "50%", transform: "translateX(-50%)", fontSize: 5, color: isActive ? "#FFD700" : "#FFE4B5", textShadow: "1px 1px #000", whiteSpace: "nowrap" }}>
                        {t.label}
                      </div>
                    </div>
                  );
                })}
                {/* BOOST button */}
                <div
                  onClick={() => { useFarmBoost(); AudioManager.playSFX("click"); }}
                  className="slot"
                  style={{
                    position: "relative",
                    background: boostCharges > 0
                      ? "linear-gradient(135deg, #FFE4B5 0%, #C8A020 100%)"
                      : "linear-gradient(135deg, #5A4030 0%, #3A2010 100%)",
                    border: boostCharges > 0 ? "3px solid #FFD700" : "3px solid #4D2D18",
                    boxShadow: boostCharges > 0 ? "0 0 14px rgba(255,215,0,0.5), inset 0 0 6px rgba(255,255,255,0.3)" : "inset 0 0 10px rgba(0,0,0,0.7)",
                    opacity: boostCharges > 0 ? 1 : 0.5,
                    cursor: boostCharges > 0 ? "pointer" : "not-allowed",
                  }}
                >
                  {/* Slot number badge for boost */}
                  <div style={{
                    position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                    background: "linear-gradient(180deg, #CE9E64 0%, #8D5A32 100%)",
                    border: "2px solid #5C4033", borderRadius: "50%",
                    width: 20, height: 20,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 2px 0 #3a2212", zIndex: 10,
                  }}>
                    <span className="gf" style={{ fontSize: 6, color: "#FFD700" }}>B</span>
                  </div>
                  <div style={{ position: "relative", width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="/boost.png" style={{ width: 40, height: 40, opacity: boostCharges > 0 ? 1 : 0.6 }} alt="BOOST" />
                    <div style={{
                      position: "absolute", bottom: 2, right: 2,
                      background: boostCharges > 0 ? "#4CAF50" : "#8D5A32",
                      border: "2px solid #5C4033", borderRadius: "50%",
                      width: 18, height: 18, fontSize: 8,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#FFF", fontWeight: "bold", zIndex: 10
                    }}>
                      {boostCharges}
                    </div>
                  </div>
                  <div className="gf" style={{ position: "absolute", bottom: -16, left: "50%", transform: "translateX(-50%)", fontSize: 5, color: "#FFE4B5", textShadow: "1px 1px #000", whiteSpace: "nowrap" }}>
                    BOOST
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── DESKTOP MAP SELECTOR ── */}
      {!isMobile && splashDone && introTutorialDone && (
        <div style={{ position: "absolute", bottom: 25, left: 25, zIndex: 1000 }}>
          <div className="tray" style={{ padding: "8px 15px", gap: 6 }}>
            {MAPS.map(m => (
              <button key={m.id} className={`wb gf ${ds.currentMap === m.id ? "active" : ""}`} style={{ fontSize: 7, padding: "7px 10px" }} onClick={() => { doSwitchMap(m.id); AudioManager.playSFX("click"); }}>
                {m.label.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── PANELS OVERLAY ── */}
      {activePanel && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "env(safe-area-inset-top,0) 16px env(safe-area-inset-bottom,0)" }} onClick={(e) => { if (e.target === e.currentTarget) closePanel(); }}>
          <div className="wood-panel" style={{ padding: 0, minWidth: isMobile ? "min(340px,92vw)" : 280, maxWidth: isMobile ? "92vw" : 380, maxHeight: isMobile ? "80dvh" : "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div className="gold-header gf" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, flexShrink: 0 }}>
              <span>
                {activePanel === "wallet" && "WALLET"}
                {activePanel === "quests" && "DAILY TASKS"}
                {activePanel === "inventory" && "INVENTORY"}
                {activePanel === "nft" && "MY NFTS"}
                {activePanel === "shop" && "CITY SHOP"}
                {activePanel === "settings" && "SETTINGS"}
              </span>
              <button className="wb" style={{ padding: "4px 10px", fontSize: 9 }} onClick={() => { closePanel(); AudioManager.playSFX("click"); }}>X</button>
            </div>
            <div style={{ padding: 14, color: "#4D2D18", overflowY: "auto", flex: 1 }} className="gf">

              {/* ── WALLET PANEL ── */}
              {activePanel === "wallet" && (
                <div style={{ textAlign: "center" }}>
                  {walletConnected ? (
                    <>
                        <div style={{ color: "#FFFFFF", fontSize: 9, marginBottom: 10 }}>CONNECTED</div>
                        <div style={{ background: "rgba(0,0,0,0.2)", border: "2px solid #5C4033", padding: "10px", borderRadius: 10, fontSize: 7, wordBreak: "break-all", color: "#FFFFFF", textShadow: "1px 1px #000", marginBottom: 10 }}>{walletAddress}</div>
                        <div style={{ color: "#FFFFFF", fontSize: 10, marginBottom: 14 }}>{ds.player.lifetopiaGold} LFG</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {walletType === "solana" && (
                            <>
                              <button className="wb gf" style={{ width: "100%", fontSize: 7, padding: "12px" }}
                                onClick={async () => { AudioManager.playSFX("click"); const res = await initializeTokenAccount(); stateRef.current.notification = { text: res.success ? "TOKEN ACCOUNT INITIALIZED!" : (res.error || "INIT FAILED").toUpperCase().slice(0, 40), life: 200 }; setDs({ ...stateRef.current }); }}>
                                INITIALIZE TOKEN ACCOUNT
                              </button>
                              <a href={`https://solscan.io/address/${walletAddress}`} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
                                <button className="wb gf" style={{ width: "100%", fontSize: 7, padding: "12px" }}>VIEW ON SOLSCAN</button>
                              </a>
                            </>
                          )}
                        {walletType === "evm" && (
                          <a href={`https://solscan.io/address/${walletAddress}`} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
                            <button className="wb gf" style={{ width: "100%", fontSize: 7, padding: "12px" }}>VIEW ON SOLSCAN</button>
                          </a>
                        )}
                        <button className="wb gf" style={{ width: "100%", fontSize: 6, padding: "10px", marginTop: 4 }} onClick={() => { disconnectWallet(); AudioManager.playSFX("click"); }}>DISCONNECT</button>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ fontSize: 8, color: "#FFFFFF", marginBottom: 4 }}>SELECT WALLET</div>
                      <button className="wb gf" onClick={() => { connectPhantom(); AudioManager.playSFX("click"); }} style={{ fontSize: 10, padding: "18px", background: phantomFound ? "linear-gradient(180deg, #777, #555)" : "linear-gradient(180deg, #5A6272, #3A4150)", border: "2px solid #FFFFFF", color: "#FFFFFF" }}>
                        {phantomFound ? "CONNECT PHANTOM" : isMobile ? "OPEN PHANTOM APP" : "INSTALL PHANTOM"}
                      </button>
                      <button className="wb gf" onClick={() => { connectMetaMask(); AudioManager.playSFX("click"); }} style={{ fontSize: 10, padding: "18px", background: metamaskFound ? "linear-gradient(180deg, #777, #555)" : "linear-gradient(180deg, #5A6272, #3A4150)", border: "2px solid #FFFFFF", color: "#FFFFFF" }}>
                        CONNECT METAMASK
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── QUESTS PANEL ── */}
              {activePanel === "quests" && (
                <div>
                  <div style={{ fontSize: 7, color: "#FFFFFF", marginBottom: 12, textAlign: "center", lineHeight: 1.8 }}>
                    COMPLETE TASKS TO EARN GOLD REWARDS!
                  </div>
                  {ds.quests.map((q) => {
                    const pct = Math.min(100, Math.round((q.current / q.target) * 100));
                    return (
                      <div key={q.id} style={{ background: q.claimed ? "rgba(0,0,0,0.08)" : q.completed ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.12)", border: `2px solid ${q.claimed ? "#5C4033" : q.completed ? "#FFFFFF" : "#8B5E3C"}`, borderRadius: 12, padding: "12px", marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={{ fontSize: 7, color: "#FFFFFF", textShadow: "1px 1px #000" }}>
                            {q.claimed ? "[DONE]" : q.completed ? "[CLAIM]" : "[...]"} {q.title}
                          </span>
                          <span style={{ fontSize: 7, color: "#FFFFFF" }}>{q.current}/{q.target}</span>
                        </div>
                        {/* Progress bar */}
                        <div style={{ background: "#3B2416", borderRadius: 6, height: 10, overflow: "hidden", marginBottom: 8 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: q.completed ? "linear-gradient(90deg, #FFFFFF, #CCCCCC)" : "linear-gradient(90deg, #C19A6B, #8D5A32)", transition: "width 0.4s ease", borderRadius: 6 }} />
                        </div>
                        <div style={{ fontSize: 6, color: "#FFFFFF", marginBottom: q.completed && !q.claimed ? 8 : 0 }}>
                          REWARD: +{q.reward} GOLD {pct < 100 ? `(${pct}% done)` : ""}
                        </div>
                        {q.completed && !q.claimed && (
                          <button className="wb gf" style={{ width: "100%", fontSize: 7, padding: "10px", background: "linear-gradient(180deg, #FFD700, #C8A020)", color: "#3E2723", border: "2px solid #FFD700" }}
                            onClick={async () => {
                              AudioManager.playSFX("click");
                              const w = stateRef.current.player.walletAddress || localStorage.getItem("wallet_addr") || "";
                              const res = claimQuestReward(stateRef.current, q.id, w);
                              if (!res) return;
                              spawnText(stateRef.current, stateRef.current.player.x, stateRef.current.player.y - 52, `+${res.reward} GOLD`, "#FFD700", -2.2);
                              const claimText = `QUEST CLAIMED: +${res.reward} GOLD`;
                              stateRef.current.notification = { text: claimText, life: 110 };
                              triggerPopup(claimText);
                              if (w && !w.toLowerCase().startsWith("guest")) { await updateSupabaseGold(w, stateRef.current.player.gold); await saveProgress(); }
                              setDs({ ...stateRef.current });
                            }}>
                          CLAIM +{q.reward} GOLD
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── INVENTORY PANEL ── */}
              {activePanel === "inventory" && (
                <div>
                  <div style={{ fontSize: 7, color: "#FFFFFF", marginBottom: 12, textAlign: "center" }}>YOUR ITEMS & SEEDS</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, maxHeight: 300, overflowY: "auto", padding: "4px" }}>
                    {Array.from({ length: 12 }).map((_, i) => {
                      const items = Object.entries(ds.player.inventory).filter(([, v]) => v > 0);
                      const item = items[i];
                      return (
                        <div key={i} className="slot" style={{ width: 58, height: 58, border: "2px solid #5C4033" }}>
                          {item ? (
                            <div style={{ textAlign: "center" }}>
                              <div style={{ fontSize: 5, color: "#FFFFFF" }}>{item[0].replace("-seed","").toUpperCase().slice(0,6)}</div>
                              <div style={{ fontSize: 8, color: "#FFFFFF" }}>x{item[1]}</div>
                            </div>
                          ) : <div style={{ opacity: 0.1, fontSize: 10, color: "#FFFFFF" }}>·</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── NFT PANEL ── */}
              {activePanel === "nft" && (
                <div style={{ textAlign: "center" }}>
                  {nfts.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                      {nfts.map((n, i) => {
                        const addr = walletAddress || localStorage.getItem("wallet_addr") || "";
                        return (
                          <div key={i} style={{ background: "#8D5A32", borderRadius: 12, overflow: "hidden", border: "2px solid #5C4033" }}>
                            <div style={{ color: "#FFFFFF", padding: "8px 10px", fontSize: 6 }}>{n}</div>
                            {addr && (
                              <a href={`https://solscan.io/account/${addr}`} target="_blank" rel="noopener noreferrer" style={{ display: "block", textDecoration: "none" }}>
                                <div style={{ background: "rgba(0,0,0,0.4)", borderTop: "2px solid #5C4033", padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                                  <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: "#FFFFFF" }}>solscan.io/{addr.slice(0,6)}...{addr.slice(-4)}</span>
                                  <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: "#FFFFFF" }}>TRACK →</span>
                                </div>
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: 8, color: "#4D2D18", marginBottom: 16 }}>NO NFTS DETECTED</div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button className="wb gf" onClick={async () => { AudioManager.playSFX("click"); const res = await initializeTokenAccount(); stateRef.current.notification = { text: res.success ? "INITIALIZED!" : (res.error || "INIT FAILED").toUpperCase().slice(0,40), life: 200 }; setDs({ ...stateRef.current }); }} style={{ width: "100%", fontSize: 7 }}>INIT ACCOUNT</button>
                    {ds.player.nftEligibility ? (
                      <button className="wb gf" onClick={() => { claimNFT(); AudioManager.playSFX("click"); }} style={{ width: "100%", fontSize: 7, background: "linear-gradient(180deg, #A2FF9E, #228B22)", color: "#FFF", border: "2px solid #FFF" }}>CLAIM ALPHA NFT</button>
                    ) : (
                      <div className="gf" style={{ fontSize: 6, color: "#8B4513", marginTop: 10, background: "rgba(0,0,0,0.05)", padding: 8, borderRadius: 8 }}>
                        FINISH ALL DAILY TASKS TO UNLOCK THIS NFT CLAIM!
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── SHOP PANEL ── */}
              {activePanel === "shop" && (
                <div style={{ padding: "0 10px 10px" }}>
                  <div className="gf" style={{ fontSize: 13, color: "var(--wood-dark)", marginBottom: 12, textAlign: "center", fontWeight: "bold" }}>
                    SEED MARKET
                  </div>
                  <div className="shop-scroll-area" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, maxHeight: isMobile ? "55dvh" : 380, overflowY: "auto", padding: "4px" }}>
                    {SHOP_ITEMS.map((item) => {
                      const crop = item.type === "seed" ? toolIdToCrop(item.id) : null;
                      const locked = !!crop && !isCropPlantingUnlocked(crop, ds.player.level, ds.farmBalancePreset);
                      const needLvl = crop ? seedUnlockLevel(crop, ds.farmBalancePreset) : 1;
                      const effPrice = item.type === "seed" ? getShopSeedPrice(item.id, item.price, ds.farmBalancePreset) : item.price;
                      return (
                        <div key={item.id} className="wood-slot" style={{ padding: "16px 10px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", opacity: locked ? 0.7 : 1 }}>
                          {locked && <div className="gf" style={{ position: "absolute", top: 8, left: 0, right: 0, fontSize: 10, color: "#FFFFFF", textAlign: "center", textShadow: "1px 1px #000", zIndex: 10 }}>LVL {needLvl}</div>}
                          <div style={{ width: 44, height: 44, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", filter: "drop-shadow(0 4px 0 rgba(0,0,0,0.2))" }}>
                            <img src={item.spriteUrl} alt={item.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                          </div>
                          <div className="gf" style={{ fontSize: 12, color: "var(--wood-dark)", marginBottom: 4, textAlign: "center", fontWeight: "bold" }}>{item.name.toUpperCase()}</div>
                          <div className="gf" style={{ fontSize: 14, color: "#D4AF37", marginBottom: 10, fontWeight: "bold", textShadow: "2px 2px 0 rgba(0,0,0,0.4)" }}>{effPrice} GOLD</div>
                          <button className="wb gf" style={{ width: "95%", fontSize: 12, padding: "8px 0" }}
                            disabled={locked}
                            onClick={(ev) => buyItem(item.id, item.price, ev)}>
                            {locked ? "LOCKED" : "BUY"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── SETTINGS PANEL ── */}
              {activePanel === "settings" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: "#8B4513", marginBottom: 4 }}>SOUND CONTROL</div>
                  <button className="wb gf" style={{ width: "100%", fontSize: 7, padding: "12px" }}
                    onClick={() => { AudioManager.init(); AudioManager.playBGM("/backsound.mp3"); stateRef.current.notification = { text: "AUDIO SYSTEM ACTIVE!", life: 100 }; setDs({ ...stateRef.current }); }}>
                    REACTIVATE AUDIO
                  </button>
                  <div style={{ fontSize: 8, color: "#8B4513", marginTop: 8, marginBottom: 4 }}>FARM DIFFICULTY</div>
                  <div style={{ fontSize: 6, color: "#D4AF37", marginBottom: 8, lineHeight: 1.8 }}>
                    EASY: Fast grow, low reward<br/>
                    MEDIUM: Balanced (recommended)<br/>
                    HARD: Slow grow, 5× gold reward
                  </div>
                  {(["easy","medium","hard"] as FarmBalancePreset[]).map((preset) => (
                    <button key={preset} className={`wb gf ${ds.farmBalancePreset === preset ? "active" : ""}`} style={{ width: "100%", fontSize: 7, padding: "12px" }} onClick={() => applyBalancePreset(preset)}>
                      {preset.toUpperCase()} MODE
                    </button>
                  ))}
                  <button className="wb gf" style={{ width: "100%", fontSize: 7, padding: "10px", marginTop: 4 }}
                    onClick={() => { stateRef.current.player.level = 1; stateRef.current.player.exp = 0; stateRef.current.player.maxExp = 100; stateRef.current.pendingCloudSave = true; stateRef.current.notification = { text: "LEVEL RESET TO 1", life: 120 }; setDs({ ...stateRef.current }); void saveProgress(); }}>
                    RESET PROGRESS (LEVEL 1)
                  </button>
                  <div style={{ marginTop: 8, fontSize: 6, color: "#8B4513", opacity: 0.7 }}>ACTIVE: {ds.farmBalancePreset.toUpperCase()} | V.1.0.0</div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── LOGO ── */}
      {splashDone && (walletConnected || walletAddress.toLowerCase().startsWith("guest")) && !isMobile && (
        <div className="logo-container"><img src="/logo.png" alt="LIFETOPIA" className="logo-img" /></div>
      )}

      {/* ── SKIP DEMO (Rectangular wood style) ── */}
      {ds.demoMode && (
        <button
          onClick={() => abortDemo()}
          className="wb gf"
          style={{
            position: "absolute", bottom: 40, right: 40, zIndex: 10000,
            width: 100, height: 50, fontSize: 10,
            boxShadow: "0 6px 0 #3a2212, 0 10px 20px rgba(0,0,0,0.4)",
          }}
        >
          SKIP
        </button>
      )}

      {/* ── FISHING ACTION BUTTON ── */}
      {splashDone && ds.currentMap === "fishing" && !ds.demoMode && (
        <button
          onClick={() => { handleFishingAction(stateRef.current); setDs({ ...stateRef.current }); }}
          className="wb gf"
          style={{
            position: "absolute", bottom: 30, right: 30, zIndex: 1000,
            width: 140, height: 60,
            background: ds.fishingSession ? "linear-gradient(180deg, #FFD700 0%, #C8A020 100%)" : undefined,
            boxShadow: ds.fishingSession ? "0 6px 0 #8d6e15, 0 0 20px rgba(255,215,0,0.4)" : "0 6px 0 #3a2212, 0 5px 15px rgba(0,0,0,0.3)",
            display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
            fontSize: 10, borderRadius: 16
          }}
        >
          <span>{ds.fishingSession ? (ds.fishingSession.state === "bite" || ds.fishingSession.state === "struggle" ? "PULL!" : "WAIT") : "CAST"}</span>
        </button>
      )}

      {/* ── LEVEL UP POPUP ── */}
      {ds.levelUpPopup && ds.time < ds.levelUpPopup.until && (
        <div style={{ position: "absolute", inset: 0, zIndex: 5500, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 100%)" }}>
          <div className="gf" style={{ padding: "28px 40px", maxWidth: 520, textAlign: "center", textShadow: "0 0 20px #FFD700" }}>
            <div style={{ fontSize: 24, color: "#FFD700", marginBottom: 14, letterSpacing: "0.1em", fontWeight: "bold" }}>LEVEL UP!</div>
            <div style={{ fontSize: 10, color: "#FFFDE7", fontWeight: "bold" }}>{ds.levelUpPopup.message}</div>
          </div>
        </div>
      )}

      {/* ── NOTIFICATION BANNER ── */}
      {ds.notification && (
        <div style={{ position: "absolute", top: isMobile ? "15%" : "20%", left: "50%", transform: "translateX(-50%)", zIndex: 5000, pointerEvents: "none" }}>
          <div className="gf" style={{ padding: "14px 28px", fontSize: isMobile ? 12 : 14, color: "#FFD700", textShadow: "2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000", textAlign: "center", maxWidth: isMobile ? "85vw" : "none", lineHeight: 1.5 }}>
            {ds.notification.text.toUpperCase()}
          </div>
        </div>
      )}
      {/* ── FISHING REGION LABELS (Unity Style Buttons) ── */}
      {splashDone && ds.currentMap === "fishing" && !activePanel && (
        <div style={{ position: "absolute", bottom: isMobile ? 120 : 40, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 20, pointerEvents: "none" }}>
          <div className="wood-panel gf" style={{ padding: "8px 16px", fontSize: 10, color: "white", textShadow: "1px 1px #000", animation: "none", opacity: 0.9 }}>
            DEEP WATER
          </div>
          <div className="wood-panel gf" style={{ padding: "8px 16px", fontSize: 10, color: "#FFD700", textShadow: "1px 1px #000", animation: "none", opacity: 0.9 }}>
            RARE FISH HUB
          </div>
        </div>
      )}
    </div>
  );
}
