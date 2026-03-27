import { useEffect, useRef, useState, useCallback } from "react";
import {
  GameState,
  MapType,
  SHOP_ITEMS,
  FARM_GRID,
  FarmBalancePreset,
  applyFarmBalancePreset,
} from "../game/Game";
import {
  createInitialState,
  updateGame,
  handleToolAction,
  switchMap,
  spawnText,
} from "../game/GameEngine";
import { renderGame, preloadAssets } from "../game/Renderer";
import { supabase } from "../game/supabase";
import { fetchTokenBalance } from "../game/blockchain";
import SplashScreen from "../components/SplashScreen";
import PreFarmTutorial from "../components/tutorial/PreFarmTutorial";
import {
  transferTokenToUser,
  getTokenBalance,
  initializeTokenAccount,
} from "../game/solanaToken";
import { AudioManager } from "../game/AudioSystem";

/* Exact tool icons from assets folder as requested */
const TOOLS = [
  { id: "sickle", label: "HOE", img: "/celurit_1774349990712.png" },
  { id: "axe", label: "AXE", img: "/kapak_1_1774349990715.png" }, // Small axe
  { id: "axe-large", label: "MEGA AXE", img: "/kapak_1774349990716.png" }, // Large axe
  { id: "water", label: "WATER", img: "/teko_siram.png" },
  { id: "wheat-seed", label: "WHEAT", img: "/wheat.png" },
  { id: "tomato-seed", label: "TOMATO", img: "/tomato.png" },
  { id: "carrot-seed", label: "CARROT", img: "/carrot.png" },
  { id: "pumpkin-seed", label: "PUMPKIN", img: "/pumpkin.png" },
] as const;

const MAPS: { id: MapType; label: string; desc: string }[] = [
  { id: "home", label: "Farm", desc: "Your farm" },
  { id: "city", label: "City", desc: "Buy items" },
  { id: "fishing", label: "Fishing", desc: "Catch fish" },
  { id: "garden", label: "Garden", desc: "Meet players" },
  { id: "suburban", label: "Suburban", desc: "Cozy area" },
];

const TOOL_IDS = TOOLS.map((t) => t.id);

export default function FarmingGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [ds, setDs] = useState<GameState>(stateRef.current);
  const [loaded, setLoaded] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [introTutorialDone, setIntroTutorialDone] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutStep, setTutStep] = useState(0);
  const [walletConnected, setWalletConnected] = useState(true);
  const [walletAddress, setWalletAddress] = useState("GuestFarmer");
  const [walletType, setWalletType] = useState<"solana" | "evm" | null>(null);
  const [nfts, setNfts] = useState<string[]>([]);
  const [phantomFound, setPhantomFound] = useState(false);
  const [metamaskFound, setMetamaskFound] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("farm_grid");
    if (saved && saved.startsWith("{")) {
      try {
        const g = JSON.parse(saved);
        if (g && typeof g === "object" && g.rows && g.cols) {
          Object.assign(FARM_GRID, g);
          const plots: any[] = [];
          for (let r = 0; r < g.rows; r++) {
            for (let c = 0; c < g.cols; c++) {
              plots.push({
                id: `plot-${r}-${c}`,
                gridX: c,
                gridY: r,
                worldX: g.startX + c * g.cellW,
                worldY: g.startY + r * g.cellH,
                tilled: false,
                watered: false,
                fertilized: false,
                crop: null,
              });
            }
          }
          stateRef.current.farmPlots = plots;
        }
      } catch (e) {
        console.warn("Restore failed:", e);
      }
    }
    preloadAssets()
      .then(() => setLoaded(true))
      .catch(() => setLoaded(true));
  }, []);

  const closePanel = useCallback(() => setActivePanel(null), []);

  const doSwitchMap = useCallback((map: MapType) => {
    stateRef.current = switchMap(stateRef.current, map);
    setDs((prev) => ({ ...prev, currentMap: map }));
  }, []);

  const handleSplashSelect = useCallback(
    (map: MapType) => {
      AudioManager.init(); // Initialize on first player choice
      AudioManager.playBGM("/backsound.mp3"); // Start main music
      doSwitchMap(map);
      setSplashDone(true);
      setIntroTutorialDone(false);
    },
    [doSwitchMap],
  );

  const handlePreFarmTutorialFinished = useCallback(() => {
    setIntroTutorialDone(true);
    stateRef.current.currentMap = "home";
    stateRef.current.notification = {
      text: "PREMIUM ONBOARDING COMPLETE. FARM SYSTEM ONLINE.",
      life: 160,
    };
    setDs({ ...stateRef.current });
  }, []);

  const handlePreFarmMapFocus = useCallback((map: MapType) => {
    stateRef.current.currentMap = map;
    setDs({ ...stateRef.current });
  }, []);

  // Detect wallets on mount (supports multiple injected providers)
  useEffect(() => {
    const getEthereumProviders = (): any[] => {
      const eth = (window as any).ethereum;
      if (!eth) return [];
      if (Array.isArray(eth.providers) && eth.providers.length > 0) {
        return eth.providers;
      }
      return [eth];
    };

    const check = () => {
      const phantom = (window as any).phantom?.solana ?? (window as any).solana;
      setPhantomFound(!!phantom?.isPhantom);

      const providers = getEthereumProviders();
      const hasMetaMask = providers.some((p) => !!p?.isMetaMask);
      setMetamaskFound(hasMetaMask);
    };

    check();
    const t = setTimeout(check, 1000);
    window.addEventListener("ethereum#initialized", check as EventListener, {
      once: true,
    });
    return () => {
      clearTimeout(t);
      window.removeEventListener(
        "ethereum#initialized",
        check as EventListener,
      );
    };
  }, []);

  const connectPhantom = async () => {
    try {
      const sol = (window as any).phantom?.solana ?? (window as any).solana;
      if (!sol?.isPhantom) {
        stateRef.current.notification = {
          text: "PHANTOM NOT FOUND. INSTALL EXTENSION.",
          life: 140,
        };
        setDs({ ...stateRef.current });
        window.open("https://phantom.app/download", "_blank");
        return;
      }

      const res = await sol.connect();
      if (!res || !res.publicKey)
        throw new Error("Connection failed: No public key");

      const addr = res.publicKey.toString();
      setWalletAddress(addr);
      setWalletType("solana");
      setWalletConnected(true);
      localStorage.setItem("wallet_addr", addr);
      localStorage.setItem("wallet_type", "solana");
      stateRef.current.player.walletAddress = addr;
      
      // FIX sync: await load before save
      setInitialLoadComplete(false); // Reset lock while loading
      await loadProgress(addr);
      
      stateRef.current.notification = { text: "PHANTOM CONNECTED!", life: 120 };
      setDs({ ...stateRef.current });
      
      // Save only if lock is open
      await saveProgress();
    } catch (e: any) {
      stateRef.current.notification = {
        text: (e?.message || "CONNECT FAILED").toUpperCase().slice(0, 40),
        life: 120,
      };
      setDs({ ...stateRef.current });
    }
  };

  const connectMetaMask = async () => {
    try {
      const eth = (window as any).ethereum;
      if (!eth) {
        stateRef.current.notification = {
          text: "METAMASK NOT FOUND. INSTALL EXTENSION.",
          life: 140,
        };
        setDs({ ...stateRef.current });
        window.open("https://metamask.io/download/", "_blank");
        return;
      }

      const provider =
        (Array.isArray(eth.providers)
          ? eth.providers.find((p: any) => p?.isMetaMask)
          : null) || eth;

      if (!provider?.request) {
        throw new Error("No Ethereum provider request interface");
      }

      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });
      const addr = accounts?.[0];
      if (!addr) throw new Error("No account returned");

      setWalletAddress(addr);
      setWalletType("evm");
      setWalletConnected(true);
      localStorage.setItem("wallet_addr", addr);
      localStorage.setItem("wallet_type", "evm");
      stateRef.current.player.walletAddress = addr;
      
      // FIX sync: await load before save
      setInitialLoadComplete(false); // Reset lock while loading
      await loadProgress(addr);

      stateRef.current.notification = {
        text: "METAMASK CONNECTED!",
        life: 120,
      };
      setDs({ ...stateRef.current });
      await saveProgress();
    } catch (e: any) {
      stateRef.current.notification = {
        text: (e?.message || "CONNECT FAILED").toUpperCase().slice(0, 40),
        life: 120,
      };
      setDs({ ...stateRef.current });
    }
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress("");
    setWalletType(null);
    localStorage.removeItem("wallet_addr");
    localStorage.removeItem("wallet_type");
    stateRef.current.player.walletAddress = "";
  };

  // PERSISTENCE: Save/Load from Supabase
  const loadProgress = async (addr: string) => {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("wallet_address", addr)
        .single();
      if (data && !error) {
        console.log("[Persistence] Loaded progress:", data);
        stateRef.current.player.gold = data.gold;
        stateRef.current.player.exp = data.exp;
        stateRef.current.player.level = data.level;
        stateRef.current.player.inventory =
          data.inventory || stateRef.current.player.inventory;
        if (data.nfts && Array.isArray(data.nfts)) setNfts(data.nfts);
        setDs({ ...stateRef.current });
      }
      setInitialLoadComplete(true); // Open lock after load attempt
    } catch (e) {
      console.warn("[Persistence] No saved data found or load error:", e);
      setInitialLoadComplete(true); // Still enable saving even if load fails (new user)
    }
  };

  const saveProgress = async () => {
    const addr = stateRef.current.player.walletAddress;
    if (!addr || addr.startsWith("guest") || !initialLoadComplete) return;
    try {
      await supabase.from("players").upsert(
        {
          wallet_address: addr,
          gold: stateRef.current.player.gold,
          exp: stateRef.current.player.exp,
          level: stateRef.current.player.level,
          inventory: stateRef.current.player.inventory,
          nfts: nfts, // Sync current NFTs list
          last_seen: new Date().toISOString(),
        },
        { onConflict: "wallet_address" },
      );
      console.log("[Persistence] Progress & NFTs synced to DB.");
    } catch (e) {
      console.error("[Persistence] Auto-save error:", e);
    }
  };

  useEffect(() => {
    const timer = setInterval(saveProgress, 10000); // More frequent auto-save (10s)
    return () => clearInterval(timer);
  }, [nfts]); // Recalibrate if NFTs change

  // Auto-restore wallet dari localStorage
  useEffect(() => {
    const addr = localStorage.getItem("wallet_addr");
    const type = localStorage.getItem("wallet_type");
    if (addr) {
      setWalletAddress(addr);
      setWalletType(type === "solana" ? "solana" : "evm");
      setWalletConnected(true);
      stateRef.current.player.walletAddress = addr;
      
      // Auto-restore progress on mount
      setInitialLoadComplete(false);
      loadProgress(addr).then(() => {
         setDs({ ...stateRef.current });
      });
    }
  }, []);

  const claimNFT = async () => {
    const addr = walletAddress || localStorage.getItem("wallet_addr");
    if (!addr) {
      stateRef.current.notification = {
        text: "CONNECT WALLET FIRST!",
        life: 120,
      };
      setDs({ ...stateRef.current });
      return;
    }

    // Show pending state
    stateRef.current.notification = { text: "CLAIMING TOKEN...", life: 300 };
    setDs({ ...stateRef.current });

    // Transfer 10 LFG token to user wallet
    const result = await transferTokenToUser(addr, 10);

    if (result.success) {
      const newNft = `LFG Token Claim #${nfts.length + 1} | tx: ${result.txid?.slice(0, 8)}...`;
      const updatedNfts = [...nfts, newNft];
      setNfts(updatedNfts);

      // Refresh on-chain balance
      const onChainBalance = await getTokenBalance(addr);
      stateRef.current.player.lifetopiaGold = onChainBalance;
      stateRef.current.notification = { text: `+10 LFG CLAIMED!`, life: 150 };
      setDs({ ...stateRef.current });

      // Save to Supabase
      try {
        await supabase.from("players").upsert(
          {
            wallet_address: addr,
            nfts: updatedNfts,
            gold: stateRef.current.player.gold,
            exp: stateRef.current.player.exp,
            level: stateRef.current.player.level,
          },
          { onConflict: "wallet_address" },
        );
      } catch (e) {
        console.error("[NFT] Supabase save failed:", e);
      }
    } else {
      stateRef.current.notification = {
        text: result.error?.slice(0, 40).toUpperCase() || "CLAIM FAILED",
        life: 150,
      };
      setDs({ ...stateRef.current });
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      stateRef.current.keys.add(key);

      if (!introTutorialDone) {
        if (key === "escape") setActivePanel(null);

        if (key === "f2") {
          stateRef.current.showFarmDebugOverlay =
            !stateRef.current.showFarmDebugOverlay;
          stateRef.current.notification = {
            text: stateRef.current.showFarmDebugOverlay
              ? "FARM DEBUG OVERLAY: ON"
              : "FARM DEBUG OVERLAY: OFF",
            life: 120,
          };
          setDs({ ...stateRef.current });
          e.preventDefault();
          return;
        }

        const consumedIntro = [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          " ",
          "e",
          "enter",
          "tab",
          "f2",
          "k",
        ];
        if (consumedIntro.includes(key)) e.preventDefault();
        return;
      }

      if (key === " " || key === "e" || key === "enter") {
        if (stateRef.current.currentMap === "city") setActivePanel("shop");
        else stateRef.current = handleToolAction(stateRef.current);
      }
      if (key === "escape") setActivePanel(null);
      if (key === "tab") {
        const order: MapType[] = [
          "home",
          "city",
          "fishing",
          "garden",
          "suburban",
        ];
        const next =
          order[(order.indexOf(stateRef.current.currentMap) + 1) % 5];
        doSwitchMap(next);
      }
      if (key === "shift") stateRef.current.player.running = true;
      const nStr = e.key;
      let n = parseInt(nStr);
      if (nStr === "0") n = 10;
      if (n >= 1 && n <= TOOL_IDS.length) {
        const toolId = TOOL_IDS[n - 1];
        stateRef.current.player.tool = toolId as any;
        setDs({ ...stateRef.current });
      }
      if (key === "f2") {
        stateRef.current.showFarmDebugOverlay =
          !stateRef.current.showFarmDebugOverlay;
        stateRef.current.notification = {
          text: stateRef.current.showFarmDebugOverlay
            ? "FARM DEBUG OVERLAY: ON"
            : "FARM DEBUG OVERLAY: OFF",
          life: 120,
        };
        setDs({ ...stateRef.current });
        e.preventDefault();
        return;
      }
      const consumed = [
        "w",
        "a",
        "s",
        "d",
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        " ",
        "e",
        "enter",
        "tab",
        "f2",
      ];
      if (consumed.includes(key)) e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys.delete(e.key.toLowerCase());
      if (e.key === "Shift") stateRef.current.player.running = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [doSwitchMap, introTutorialDone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loaded) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const loop = (ts: number) => {
      const dt = Math.min(ts - (lastTimeRef.current || ts) || 16, 32);
      lastTimeRef.current = ts;
      stateRef.current = updateGame(stateRef.current, dt);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      renderGame(ctx, stateRef.current, canvas.width, canvas.height);

      // SYNC ACTIVE PANEL FOR DEMO
      if (stateRef.current.activePanel !== activePanel) {
        setActivePanel(stateRef.current.activePanel);
      }

      if (Math.floor(ts / 120) !== Math.floor((ts - dt) / 120))
        setDs({ ...stateRef.current });
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [loaded]);

  // SUPABASE: Save/Load Sync
  const applyBalancePreset = (preset: FarmBalancePreset) => {
    stateRef.current.farmBalancePreset = preset;
    applyFarmBalancePreset(preset);
    stateRef.current.notification = {
      text: `BALANCE PRESET: ${preset.toUpperCase()}`,
      life: 120,
    };
    setDs({ ...stateRef.current });
  };

  const selectTool = (toolId: string) => {
    AudioManager.playSFX("click"); // Immediate feedback
    stateRef.current.player.tool = toolId as any;
    
    // SEQUENTIAL TUTORIAL LOGIC
    const s = stateRef.current.player;
    if (s.tutorialStep === 1 && toolId === "sickle") s.tutorialStep = 2;
    if (s.tutorialStep === 3 && toolId === "fertilizer") s.tutorialStep = 4;
    if (s.tutorialStep === 5 && toolId.includes("wheat-seed")) s.tutorialStep = 6;
    if (s.tutorialStep === 7 && toolId === "water") s.tutorialStep = 8;
    if (s.tutorialStep === 9 && toolId === "sickle") s.tutorialStep = 10;

    setDs({ ...stateRef.current });
  };

  const onWheel = (e: React.WheelEvent) => {
    stateRef.current.targetZoom = Math.max(
      0.8,
      Math.min(3, stateRef.current.targetZoom + (e.deltaY > 0 ? -0.2 : 0.2)),
    );
    e.preventDefault();
  };

  const [savedGridInfo, setSavedGridInfo] = useState<string | null>(null);
  const [isDraggingGrid, setIsDraggingGrid] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartScreen, setDragStartScreen] = useState({ x: 0, y: 0 });
  const [dragCurrentScreen, setDragCurrentScreen] = useState({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    if (activePanel !== "grid-editor") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const tx = (e.clientX - rect.left) * scaleX + stateRef.current.cameraX;
    const ty = (e.clientY - rect.top) * scaleY + stateRef.current.cameraY;

    setDragStart({
      x: tx / stateRef.current.zoom,
      y: ty / stateRef.current.zoom,
    });
    setIsDraggingGrid(true);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingGrid || activePanel !== "grid-editor") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const tx = (e.clientX - rect.left) * scaleX + stateRef.current.cameraX;
    const ty = (e.clientY - rect.top) * scaleY + stateRef.current.cameraY;
    const currentX = tx / stateRef.current.zoom;
    const currentY = ty / stateRef.current.zoom;

    const x = Math.min(dragStart.x, currentX);
    const y = Math.min(dragStart.y, currentY);
    const w = Math.abs(currentX - dragStart.x);
    const h = Math.abs(currentY - dragStart.y);

    (FARM_GRID as any).startX = Math.floor(x);
    (FARM_GRID as any).startY = Math.floor(y);
    (FARM_GRID as any).cellW = Math.floor(w / FARM_GRID.cols);
    (FARM_GRID as any).cellH = Math.floor(h / FARM_GRID.rows);
    setDs({ ...stateRef.current });
  };

  const onMouseUp = () => {
    if (isDraggingGrid) {
      setIsDraggingGrid(false);
      stateRef.current.notification = { text: "GRID AREA UPDATED!", life: 100 };
      setDs({ ...stateRef.current });
    }
  };

  const onClick = (e: React.MouseEvent) => {
    if (isDraggingGrid || activePanel === "grid-editor") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    // TUTORIAL: Click-to-Action progression
    const s = stateRef.current.player;
    const oldStep = s.tutorialStep;
    
    stateRef.current = handleToolAction(stateRef.current, mx, my);
    
    // Check if tutorial advanced (handled in handleToolAction for soil, but we can verify here)
    // Actually, I'll update handleToolAction later, for now we can check plot states.
    if (oldStep === 2) {
      const isAnyTilled = stateRef.current.farmPlots.some(p => p.tilled);
      if (isAnyTilled) s.tutorialStep = 3;
    }
    if (oldStep === 4) {
      const isAnyFertilized = stateRef.current.farmPlots.some(p => p.fertilized);
      if (isAnyFertilized) s.tutorialStep = 5;
    }
    if (oldStep === 6) {
      const isAnyPlanted = stateRef.current.farmPlots.some(p => p.crop);
      if (isAnyPlanted) s.tutorialStep = 7;
    }
    if (oldStep === 8) {
      const isAnyWatered = stateRef.current.farmPlots.some(p => p.watered);
      if (isAnyWatered) s.tutorialStep = 9;
    }

    setDs({ ...stateRef.current });
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (activePanel) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (touch.clientX - rect.left) * scaleX;
    const my = (touch.clientY - rect.top) * scaleY;
    stateRef.current = handleToolAction(stateRef.current, mx, my);
    setDs({ ...stateRef.current });
  };

  const buyItem = (id: string, price: number) => {
    const s = stateRef.current;
    if (s.player.gold < price) {
      stateRef.current.notification = { text: "❌ Not enough GOLD!", life: 80 };
      setDs({ ...stateRef.current });
      return;
    }
    stateRef.current.player = {
      ...s.player,
      gold: s.player.gold - price,
      inventory: {
        ...s.player.inventory,
        [id]: (s.player.inventory[id] || 0) + 1,
      },
    };
    spawnText(
      stateRef.current,
      s.player.x,
      s.player.y - 40,
      `-${price}G`,
      "#FF8888",
    );
    setDs({ ...stateRef.current });
  };

  const hpPct = ds.player.hp / ds.player.maxHp;
  const mapLabels: Record<MapType, string> = {
    home: "🏡 FARM",
    city: "🏙️ CITY SHOPS",
    fishing: "🎣 FISHING SPOT",
    garden: "🌺 SOCIAL GARDEN",
    suburban: "🏡 SUBURBAN",
  };

  return (
    <div
      style={{
        position: "relative",
        width: 1280,
        height: 720,
        overflow: "hidden",
        background: "#000",
        margin: "0 auto",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        .gf { font-family: 'Press Start 2P', 'Courier New', monospace; }

        .wood-panel {
          background: linear-gradient(180deg, #CE9E64 0%, #8D5A32 100%);
          border: 4px solid #5C4033;
          border-radius: 16px;
          box-shadow: 0 12px 30px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.3);
          position: relative;
        }

        .gold-header {
          background: #5C4033;
          border-radius: 10px 10px 0 0;
          padding: 10px 12px;
          color: #FFD700;
          text-shadow: 1px 1px #000;
          font-size: 10px;
          letter-spacing: 1px;
        }

        .wb {
          font-family: 'Press Start 2P', 'Courier New', monospace;
          background: linear-gradient(180deg, #CE9E64 0%, #8D5A32 100%);
          border: 3px solid #5C4033;
          border-radius: 999px;
          color: #FFF5E0;
          cursor: pointer;
          box-shadow: 0 4px 0 #3a2212, inset 0 1px 1px rgba(255,255,255,0.45);
          transition: all 0.08s ease;
          padding: 8px 14px;
          font-size: 8px;
          text-shadow: 1px 1px 1px #000;
        }
        .wb:hover { background: linear-gradient(180deg, #D9B380 0%, #AD7D54 100%); transform: translateY(-2px); box-shadow: 0 6px 0 #3a2212; }
        .wb:active { transform: translateY(2px); box-shadow: 0 2px 0 #3a2212; }
        .wb.active { background: linear-gradient(180deg, #FFD700 0%, #C8A020 100%); color: #3E2723; box-shadow: 0 0 15px rgba(255,215,0,0.5); text-shadow:none; }

        .hp-bar-bg { background: #3B2416; border: 2px solid #5C4033; border-radius: 6px; height: 18px; overflow: hidden; position: relative; }
        .hp-bar-fill { height: 100%; background: linear-gradient(180deg, #7CF34B 0%, #4CAF50 100%); box-shadow: inset 0 0 4px rgba(255,255,255,0.4); transition: width 0.4s cubic-bezier(0.2, 0, 0, 1); }

        .quest-strip {
          background: linear-gradient(180deg, #FFD700 0%, #C8A020 100%);
          margin-bottom: 5px;
          padding: 8px 10px;
          border-radius: 6px;
          font-size: 7px;
          color: #3E2723;
          border: 2px solid #5C4033;
          box-shadow: 0 2px 0 rgba(0,0,0,0.3);
          font-weight: bold;
        }

        .tray {
          background: linear-gradient(180deg, #A07844 0%, #7B502C 100%);
          padding: 12px 20px;
          border-radius: 50px;
          border: 4px solid #5C4033;
          box-shadow: 0 10px 0 rgba(0,0,0,0.5), inset 0 2px 8px rgba(255,255,255,0.25);
          display: flex; gap: 8px;
        }
        .slot {
          width: 58px; height: 58px;
          background: linear-gradient(135deg, #8B5E3C 0%, #5E3A24 100%);
          border: 3px solid #4D2D18;
          border-radius: 50%;
          cursor: pointer;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          position: relative; transition: all 0.1s;
          box-shadow: inset 0 0 10px rgba(0,0,0,0.7), 0 3px 6px rgba(0,0,0,0.3);
        }
        .slot:hover { transform: translateY(-5px) scale(1.05); border-color: #FFD700; box-shadow: 0 5px 15px rgba(255,215,0,0.3); }
        .slot.active-tool {
          background: linear-gradient(135deg, #FFE4B5 0%, #D4AF37 100%);
          border-color: #FFF;
          box-shadow: 0 0 20px rgba(255,215,0,0.6), inset 0 0 5px #FFF;
        }
        .tool-img {
          width: 40px; height: 40px;
          image-rendering: auto; object-fit: contain;
          filter: drop-shadow(2px 4px 4px rgba(0,0,0,0.6));
        }
        .slot-key {
          position: absolute; top: 6px; left: 50%; transform: translateX(-50%);
          font-size: 5px; color: #FFD700; font-weight:bold;
          text-shadow: 1px 1.5px 1px #000;
        }

        .logo-container {
          position: absolute; top: 15px; left: 15px; z-index: 2000;
          overflow: hidden; cursor: pointer; border-radius: 20px;
        }
        .logo-img {
          height: 150px;
          object-fit: contain;
          filter: drop-shadow(4px 0 0 #FFF) drop-shadow(-4px 0 0 #FFF) drop-shadow(0 4px 0 #FFF) drop-shadow(0 -4px 0 #FFF) drop-shadow(0 20px 20px rgba(0,0,0,0.6));
          position: relative;
        }
        .logo-container::after {
          content: "";
          position: absolute; top: -50%; left: -60%;
          width: 25%; height: 200%;
          background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%);
          transform: rotate(30deg);
          animation: shine 4s infinite linear;
        }
        @keyframes shine {
          0% { left: -100%; }
          30% { left: 150%; }
          100% { left: 150%; }
        }

        /* PREMIUM UNITY-STYLE SCROLLBAR */
        .shop-scroll-area::-webkit-scrollbar { width: 10px; }
        .shop-scroll-area::-webkit-scrollbar-track { background: #5C4033; border-radius: 10px; }
        .shop-scroll-area::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #D4AF37 0%, #8B5E3C 100%); border: 2px solid #5C4033; border-radius: 10px; }
        .shop-scroll-area::-webkit-scrollbar-thumb:hover { background: #FFD700; }

        @keyframes toolGlow {
          0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.8); outline: 4px solid rgba(255,255,255,0); }
          50% { box-shadow: 0 0 25px 15px rgba(255,255,255,0.5); outline: 6px solid #FFF; }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.8); outline: 4px solid rgba(255,255,255,0); }
        }
        .glowing-tool {
          animation: toolGlow 1.5s infinite;
          z-index: 10000;
          border-radius: 50%;
        }
        @keyframes pft-instr-bounce {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -10px); }
        }
      `}</style>

      {/* TUTORIAL INSTRUCTION BOX REMOVED AS REQUESTED - ONLY BADGES REMAIN */}

      {/* LOGO WITH PREMIUM SHINE EFFECT - ONLY SHOW IN GAME */}
      {splashDone && walletConnected && (
        <div className="logo-container">
          <img src="/logo.png" alt="LIFETOPIA" className="logo-img" />
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        onClick={onClick}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onWheel={onWheel}
        onTouchEnd={onTouchEnd}
        style={{
          display: "block",
          cursor: activePanel === "grid-editor" ? "cell" : "crosshair",
          touchAction: "none",
        }}
      />

      {/* SPLASH LOGO FIRST */}
      {!splashDone && (
        <SplashScreen onSelectMap={handleSplashSelect} />
      )}

      {/* PRE-FARM CINEMATIC TUTORIAL FLOW */}
      {splashDone && !introTutorialDone && (
        <PreFarmTutorial
          visible={true}
          onFinished={handlePreFarmTutorialFinished}
          onMapFocus={handlePreFarmMapFocus}
        />
      )}

      {/* TOP NAV - UNIFIED HUB */}
      {splashDone && introTutorialDone && (
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <div
            className="wb gf"
            style={{
              color: "#FFE4B5",
              padding: "6px 15px",
              pointerEvents: "none",
            }}
          >
            LVL {ds.player.level}
          </div>
          <button className="wb gf" onClick={() => setActivePanel("wallet")}>
            WALLET
          </button>
          <button className="wb gf" onClick={() => setActivePanel("quests")}>
            TASKS
          </button>
          <button className="wb gf" onClick={() => setActivePanel("inventory")}>
            ITEMS
          </button>
          <button className="wb gf" onClick={() => setActivePanel("nft")}>
            MY NFTS
          </button>
          <div
            className="wb gf"
            style={{ color: "#FFD700", pointerEvents: "none" }}
          >
            G {ds.player.gold}
          </div>
          <div
            className="wb gf"
            style={{ color: "#00BFFF", pointerEvents: "none" }}
          >
            {ds.player.lifetopiaGold} LFG
          </div>
          <button
            className="wb gf"
            style={{ fontSize: 14, padding: "6px 10px" }}
            onClick={() => setActivePanel("settings")}
          >
            ⚙
          </button>
        </div>
      )}

      {/* BOTTOM CENTER TOOLS */}
      {splashDone && introTutorialDone && (
        <div
          style={{
            position: "absolute",
            bottom: 100, // Moved up to avoid overlapping and for better visibility
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {ds.currentMap === "home" && (
            <div
              className="tray"
              style={{
                pointerEvents:
                  tutorialActive || ds.demoMode || !introTutorialDone
                    ? "none"
                    : "auto",
                opacity:
                  tutorialActive || ds.demoMode || !introTutorialDone ? 0.7 : 1,
              }}
            >
              {TOOLS.map((t, i) => {
                const matchesStep =
                  tutorialActive &&
                  ((tutStep === 1 && t.id === "sickle") ||
                    (tutStep === 2 &&
                      (t.id === "wheat-seed" || t.id.includes("seed"))) ||
                    (tutStep === 3 && t.id === "water") ||
                    (tutStep === 4 && (t.id === "axe" || t.id === "axe-large")));
                
                // Guide numbers for first timers
                let guideStep: number | null = null;
                if (t.id === "sickle") guideStep = 1;
                if (t.id.endsWith("-seed") && t.id.includes("wheat")) guideStep = 2; // Point to wheat as step 2
                if (t.id === "water") guideStep = 3;

                return (
                  <div
                    key={t.id}
                    className={`slot ${ds.player.tool === t.id ? "active-tool" : ""} ${matchesStep ? "glowing-tool" : ""}`}
                    onClick={() => selectTool(t.id)}
                  >
                    <span className="slot-key">{i + 1}</span>
                    {/* LOGICAL SEQUENCE BADGES (1: Hoe, 2: Wheat, 3: Water, 4: Tomato, 5: Carrot, 6: Pumpkin, 7: Axe, 8: Large Axe) */}
                    {(() => {
                      let logicalNum = i + 1;
                      if (t.id === "sickle") logicalNum = 1;
                      else if (t.id === "wheat-seed") logicalNum = 2; // Slot 5
                      else if (t.id === "water") logicalNum = 3; // Slot 4
                      else if (t.id === "tomato-seed") logicalNum = 4; // Slot 6
                      else if (t.id === "carrot-seed") logicalNum = 5; // Slot 7
                      else if (t.id === "pumpkin-seed") logicalNum = 6; // Slot 8
                      else if (t.id === "axe") logicalNum = 7; // Slot 2
                      else if (t.id === "axe-large") logicalNum = 8; // Slot 3

                      return (
                        <div 
                          style={{
                            position: 'absolute',
                            top: -12,
                            right: -12,
                            width: 24,
                            height: 24,
                            background: '#FFD700',
                            border: '2px solid #5C4033',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#3E2723',
                            fontSize: 10,
                            fontWeight: 'bold',
                            zIndex: 20,
                            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                            // ONLY PULSE IF IT IS THE CURRENT TUTORIAL TARGET
                            animation: (
                                (ds.player.tutorialStep === 1 && logicalNum === 1) ||
                                (ds.player.tutorialStep === 5 && logicalNum === 2) || // Wheat step
                                (ds.player.tutorialStep === 7 && logicalNum === 3)   // Water step
                            ) ? 'pulse 1s infinite' : 'none'
                          }}
                        >
                          {logicalNum}
                        </div>
                      );
                    })()}

                    {t.img.startsWith("/") ? (
                      <img src={t.img} className="tool-img" alt={t.label} />
                    ) : (
                      <div style={{ fontSize: 24 }}>{t.img}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MAP SELECTOR - RESTORED BROWN TRAY */}
      {splashDone && introTutorialDone && (
        <div style={{ position: 'absolute', bottom: 25, left: 25, zIndex: 1000 }}>
          <div className="tray" style={{ padding: '8px 15px', gap: 6 }}>
            {MAPS.map(m => (
              <button 
                key={m.id}
                className={`wb gf ${ds.currentMap === m.id ? 'active' : ''}`}
                style={{ fontSize: 7, padding: '7px 10px' }}
                onClick={() => doSwitchMap(m.id)}
              >
                {m.label.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* POP-UPS */}
      {activePanel && (
        <div
          className="panel-overlay"
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
        >
          <div
            className="wood-panel"
            style={{ padding: 12, minWidth: 260, maxWidth: 360 }}
          >
            <div
              className="gold-header gf"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 12,
              }}
            >
              <span>{activePanel.toUpperCase()}</span>
              <button
                className="wb"
                style={{ padding: "3px 8px", fontSize: 8 }}
                onClick={closePanel}
              >
                X
              </button>
            </div>
            <div style={{ padding: 14, color: "#4D2D18" }} className="gf">
              {activePanel === "wallet" && (
                <div style={{ textAlign: "center" }}>
                  {walletConnected ? (
                    <>
                      <div
                        style={{
                          color: "#8B4513",
                          fontSize: 9,
                          marginBottom: 10,
                        }}
                      >
                        CONNECTED
                      </div>
                      <div
                        style={{
                          background: "rgba(0,0,0,0.15)",
                          border: "2px solid #5C4033",
                          padding: "10px",
                          borderRadius: 10,
                          fontSize: 7,
                          wordBreak: "break-all",
                          color: "#FFF5E0",
                          textShadow: "1px 1px #000",
                          marginBottom: 10,
                        }}
                      >
                        {walletAddress}
                      </div>
                      <div
                        style={{
                          color: "#56CCFF",
                          fontSize: 10,
                          marginBottom: 12,
                        }}
                      >
                        {ds.player.lifetopiaGold} LFG
                      </div>
                      {walletType === "solana" && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            marginBottom: 8,
                          }}
                        >
                          <button
                            className="wb gf"
                            style={{
                              width: "100%",
                              fontSize: 7,
                              padding: "10px",
                              background:
                                "linear-gradient(180deg, #14F195, #00A3FF)",
                              border: "2px solid #00A3FF",
                            }}
                            onClick={async () => {
                              const res = await initializeTokenAccount();
                              if (res.success)
                                stateRef.current.notification = {
                                  text: "INITIALIZED SAVED ON SOLSCAN",
                                  life: 200,
                                };
                              else
                                stateRef.current.notification = {
                                  text: (res.error || "INIT FAILED")
                                    .toUpperCase()
                                    .slice(0, 40),
                                  life: 150,
                                };
                              setDs({ ...stateRef.current });
                            }}
                          >
                            INITIALIZE TOKEN ACCOUNT
                          </button>
                          <a
                            href={`https://explorer.solana.com/address/${walletAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: "block" }}
                          >
                            <button
                              className="wb gf"
                              style={{
                                width: "100%",
                                fontSize: 7,
                                padding: "10px",
                                background:
                                  "linear-gradient(180deg, #9945FF, #6B2FBF)",
                                border: "2px solid #7B3FDF",
                              }}
                            >
                              VIEW ON SOLANA EXPLORER
                            </button>
                          </a>
                        </div>
                      )}
                      {walletType === "evm" && (
                        <a
                          href={`https://etherscan.io/address/${walletAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: "block", marginBottom: 8 }}
                        >
                          <button
                            className="wb gf"
                            style={{
                              width: "100%",
                              fontSize: 7,
                              padding: "10px",
                              background:
                                "linear-gradient(180deg, #627EEA, #3B5BD9)",
                              border: "2px solid #4A6FD9",
                            }}
                          >
                            VIEW ON ETHERSCAN
                          </button>
                        </a>
                      )}
                      <button
                        className="wb gf"
                        style={{
                          width: "100%",
                          fontSize: 6,
                          padding: "8px",
                          marginTop: 4,
                        }}
                        onClick={disconnectWallet}
                      >
                        DISCONNECT
                      </button>
                    </>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 8,
                          color: "#B8CAEE",
                          marginBottom: 4,
                        }}
                      >
                        SELECT WALLET
                      </div>
                      <button
                        className="wb gf"
                        onClick={connectPhantom}
                        style={{
                          fontSize: 9,
                          padding: "16px",
                          background: phantomFound
                            ? "linear-gradient(180deg, #9D7BFF, #5B31C7)"
                            : "linear-gradient(180deg, #5A6272, #3A4150)",
                          border: phantomFound
                            ? "2px solid #B7A1FF"
                            : "2px solid #6D7485",
                          color: "#F5F7FF",
                        }}
                      >
                        {phantomFound ? "CONNECT PHANTOM" : "INSTALL PHANTOM"}
                      </button>
                      <button
                        className="wb gf"
                        onClick={connectMetaMask}
                        style={{
                          fontSize: 9,
                          padding: "16px",
                          background: metamaskFound
                            ? "linear-gradient(180deg, #FFAA45, #D97812)"
                            : "linear-gradient(180deg, #5A6272, #3A4150)",
                          border: metamaskFound
                            ? "2px solid #FFC47B"
                            : "2px solid #6D7485",
                          color: "#F5F7FF",
                        }}
                      >
                        {metamaskFound
                          ? "CONNECT METAMASK"
                          : "INSTALL METAMASK"}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {activePanel === "quests" && (
                <div>
                   {ds.quests.map((q) => (
                    <div
                      key={q.id}
                      style={{
                        background: 'rgba(0,0,0,0.1)',
                        borderBottom: "1px solid #5C4033",
                        padding: "10px",
                        fontSize: 7,
                        color: q.completed ? '#3d8b3d' : '#4D2D18',
                        textShadow: q.completed ? 'none' : '0 1px rgba(255,255,255,0.2)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{q.completed ? "✅" : "⏳"} {q.title}</span>
                        <span style={{ color: '#8B4513' }}>{q.current}/{q.target}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activePanel === "inventory" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 8,
                    maxHeight: 280,
                    overflowY: "auto",
                    padding: "4px",
                  }}
                >
                  {Array.from({ length: 12 }).map((_, i) => {
                    const items = Object.entries(ds.player.inventory);
                    const item = items[i];
                    return (
                      <div
                        key={i}
                        className="slot"
                        style={{
                          width: 58,
                          height: 58,
                          border: "2px solid #5C4033",
                        }}
                      >
                        {item && item[1] > 0 ? (
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 5, color: "#FFE4B5" }}>
                              {item[0].toUpperCase()}
                            </div>
                            <div style={{ fontSize: 8, color: "#FFD700" }}>
                              x{item[1]}
                            </div>
                          </div>
                        ) : (
                          <div style={{ opacity: 0.1, fontSize: 10 }}></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {activePanel === "nft" && (
                <div style={{ textAlign: "center" }}>
                  {nfts.length > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {nfts.map((n, i) => {
                        const addr =
                          walletAddress ||
                          localStorage.getItem("wallet_addr") ||
                          "";
                        const solscanUrl = addr
                          ? `https://solscan.io/account/${addr}`
                          : null;
                        return (
                          <div
                            key={i}
                            style={{
                              background: "#D4AF37",
                              borderRadius: 12,
                              overflow: "hidden",
                              border: "2px solid #B8860B",
                            }}
                          >
                            <div
                              style={{
                                color: "#3E2723",
                                padding: "8px 10px",
                                fontSize: 6,
                              }}
                            >
                              {n}
                            </div>
                            {solscanUrl ? (
                              <a
                                href={solscanUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "block",
                                  textDecoration: "none",
                                }}
                              >
                                <div
                                  style={{
                                    background:
                                      "linear-gradient(180deg, #1a1a2e, #16213e)",
                                    borderTop: "2px solid #B8860B",
                                    padding: "8px 10px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    cursor: "pointer",
                                    gap: 6,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontFamily: "'Press Start 2P', monospace",
                                      fontSize: 6,
                                      color: "#9945FF",
                                    }}
                                  >
                                    solscan.io/account/{addr.slice(0, 6)}...
                                    {addr.slice(-4)}
                                  </span>
                                  <span
                                    style={{
                                      fontFamily: "'Press Start 2P', monospace",
                                      fontSize: 6,
                                      color: "#FFD700",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    CLICK TO TRACK →
                                  </span>
                                </div>
                              </a>
                            ) : (
                              <div
                                style={{
                                  background: "#333",
                                  borderTop: "2px solid #B8860B",
                                  padding: "8px 10px",
                                  fontSize: 6,
                                  color: "#888",
                                  fontFamily: "'Press Start 2P', monospace",
                                }}
                              >
                                CONNECT WALLET TO TRACK
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: 8, color: "#5C4033" }}>
                      NO NFTS DETECTED
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      className="wb gf"
                      onClick={async () => {
                        const res = await initializeTokenAccount();
                        if (res.success)
                          stateRef.current.notification = {
                            text: "INITIALIZED ON SOLSCAN",
                            life: 200,
                          };
                        else
                          stateRef.current.notification = {
                            text: (res.error || "INIT FAILED")
                              .toUpperCase()
                              .slice(0, 40),
                            life: 150,
                          };
                        setDs({ ...stateRef.current });
                      }}
                      style={{ flex: 1, fontSize: 8 }}
                    >
                      INITIALIZE ACCOUNT
                    </button>
                    <button
                      className="wb gf"
                      onClick={claimNFT}
                      style={{ flex: 1, fontSize: 8 }}
                    >
                      CLAIM ALPHA NFT
                    </button>
                  </div>
                </div>
              )}
              {activePanel === "shop" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 10,
                    maxHeight: 320,
                    overflowY: "auto",
                    padding: "4px",
                  }}
                >
                  {SHOP_ITEMS.map((item) => (
                    <div
                      key={item.id}
                      className="wood-panel"
                      style={{
                        padding: "12px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        background: "#8B5E3C",
                        border: "3px solid #5C4033",
                        borderRadius: "15px",
                      }}
                    >
                      <div
                        className="gf"
                        style={{
                          fontSize: 7,
                          color: "#FFD700",
                          marginBottom: 5,
                        }}
                      >
                        {item.name.toUpperCase()}
                      </div>
                      <div
                        className="slot"
                        style={{ width: 50, height: 50, margin: "5px 0" }}
                      ></div>
                      <div
                        className="gf"
                        style={{ fontSize: 6, color: "#FFF", margin: "8px 0" }}
                      >
                        {item.price} GOLD
                      </div>
                      <button
                        className="wb gf"
                        style={{ width: "100%", fontSize: 6, padding: "8px 0" }}
                        onClick={() => buyItem(item.id, item.price)}
                      >
                        BUY (1)
                      </button>
                    </div>
                  ))}
                  {Array.from({
                    length: Math.max(0, 4 - SHOP_ITEMS.length),
                  }).map((_, i) => (
                    <div
                      key={i}
                      className="slot"
                      style={{ width: "100%", height: 100, opacity: 0.1 }}
                    />
                  ))}
                </div>
              )}
              {activePanel === "settings" && (
                <div 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 12,
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: 8, color: "#8B4513", marginBottom: 4 }}>SOUND CONTROL</div>
                  
                  <button 
                    className="wb gf"
                    style={{ width: '100%', fontSize: 7, padding: '10px' }}
                    onClick={() => {
                        AudioManager.init();
                        AudioManager.playBGM("/backsound.mp3");
                        stateRef.current.notification = { text: "AUDIO SYSTEM ACTIVE!", life: 100 };
                        setDs({...stateRef.current});
                    }}
                  >
                    REACTIVATE AUDIO
                  </button>

                  <div style={{ fontSize: 8, color: "#8B4513", marginTop: 8, marginBottom: 4 }}>FARM DIFFICULTY</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(["casual", "normal", "hard"] as FarmBalancePreset[]).map((preset) => (
                      <button
                        key={preset}
                        className={`wb gf ${ds.farmBalancePreset === preset ? "active" : ""}`}
                        style={{ width: '100%', fontSize: 7, padding: '10px' }}
                        onClick={() => applyBalancePreset(preset)}
                      >
                        {preset.toUpperCase()} MODE
                      </button>
                    ))}
                  </div>

                  <div style={{ marginTop: 8, fontSize: 6, color: '#8B4513', opacity: 0.7 }}>
                    ACTIVE: {ds.farmBalancePreset.toUpperCase()} | V.0.9.7
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* FARM AREA VISUAL EDITOR REMOVED AS REQUESTED */}

      {activePanel === "farm-area-editor" && (
        <>
          {/* Full-screen drag capture layer */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2000,
              cursor: "crosshair",
            }}
            onMouseDown={(e) => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const rect = canvas.getBoundingClientRect();
              const scaleX = canvas.width / rect.width;
              const scaleY = canvas.height / rect.height;
              const sx = e.clientX - rect.left;
              const sy = e.clientY - rect.top;
              const wx =
                (sx * scaleX + stateRef.current.cameraX) /
                stateRef.current.zoom;
              const wy =
                (sy * scaleY + stateRef.current.cameraY) /
                stateRef.current.zoom;
              setDragStart({ x: wx, y: wy });
              setDragStartScreen({ x: e.clientX, y: e.clientY });
              setDragCurrentScreen({ x: e.clientX, y: e.clientY });
              setIsDraggingGrid(true);
            }}
            onMouseMove={(e) => {
              if (!isDraggingGrid) return;
              setDragCurrentScreen({ x: e.clientX, y: e.clientY });
              const canvas = canvasRef.current;
              if (!canvas) return;
              const rect = canvas.getBoundingClientRect();
              const scaleX = canvas.width / rect.width;
              const scaleY = canvas.height / rect.height;
              const wx =
                ((e.clientX - rect.left) * scaleX + stateRef.current.cameraX) /
                stateRef.current.zoom;
              const wy =
                ((e.clientY - rect.top) * scaleY + stateRef.current.cameraY) /
                stateRef.current.zoom;
              const x = Math.min(dragStart.x, wx);
              const y = Math.min(dragStart.y, wy);
              const w = Math.abs(wx - dragStart.x);
              const h = Math.abs(wy - dragStart.y);
              const cols = Math.max(1, Math.round(w / 80));
              const rows = Math.max(1, Math.round(h / 70));
              (FARM_GRID as any).startX = Math.round(x);
              (FARM_GRID as any).startY = Math.round(y);
              (FARM_GRID as any).cols = cols;
              (FARM_GRID as any).rows = rows;
              (FARM_GRID as any).cellW = Math.round(w / cols);
              (FARM_GRID as any).cellH = Math.round(h / rows);
              setDs({ ...stateRef.current });
            }}
            onMouseUp={() => {
              if (!isDraggingGrid) return;
              setIsDraggingGrid(false);
              // Preview stays visible, user clicks SAVE button to confirm
              setDs({ ...stateRef.current });
            }}
          />

          {/* Instruction hint */}
          {!isDraggingGrid && (
            <div
              style={{
                position: "absolute",
                bottom: 160,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 2001,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                className="wb gf"
                style={{
                  fontSize: 10,
                  padding: "12px 24px",
                  background: "rgba(30,15,5,0.93)",
                  border: "3px solid #FFD700",
                  color: "#FFD700",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.9)",
                  pointerEvents: "none",
                }}
              >
                KLIK & DRAG DI AREA TANAH
              </div>

              {/* SAVE button — only show after a drag has been done */}
              {FARM_GRID.cols > 0 && FARM_GRID.cellW > 0 && (
                <button
                  className="wb gf"
                  style={{
                    fontSize: 11,
                    padding: "12px 32px",
                    background: "linear-gradient(180deg,#4CAF50,#2E7D32)",
                    border: "3px solid #1B5E20",
                    color: "#FFF",
                    boxShadow: "0 6px 0 #1B5E20, 0 8px 24px rgba(0,0,0,0.7)",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    const { cols, rows, cellW, cellH, startX, startY } =
                      FARM_GRID;
                    // Validate before saving
                    if (cellW < 10 || cellH < 10 || cols < 1 || rows < 1) {
                      stateRef.current.notification = {
                        text: "DRAG LEBIH BESAR!",
                        life: 100,
                      };
                      setDs({ ...stateRef.current });
                      return;
                    }
                    const newPlots: any[] = [];
                    for (let r = 0; r < rows; r++) {
                      for (let c = 0; c < cols; c++) {
                        newPlots.push({
                          id: `plot-${r}-${c}`,
                          gridX: c,
                          gridY: r,
                          worldX: startX + c * cellW,
                          worldY: startY + r * cellH,
                          tilled: false,
                          watered: false,
                          fertilized: false,
                          crop: null,
                        });
                      }
                    }
                    stateRef.current.farmPlots = newPlots;
                    localStorage.setItem(
                      "farm_grid",
                      JSON.stringify({
                        cols,
                        rows,
                        cellW,
                        cellH,
                        startX,
                        startY,
                      }),
                    );
                    stateRef.current.notification = {
                      text: `✅ FARM SAVED: ${cols}x${rows} PLOTS`,
                      life: 150,
                    };
                    setSavedGridInfo(
                      `startX:${startX} startY:${startY} cellW:${cellW} cellH:${cellH} cols:${cols} rows:${rows}`,
                    );
                    setDs({ ...stateRef.current });
                    setActivePanel(null);
                  }}
                >
                  💾 SAVE FARM AREA
                </button>
              )}
            </div>
          )}

          {/* Live rectangle preview in screen space */}
          {isDraggingGrid &&
            (() => {
              const x = Math.min(dragStartScreen.x, dragCurrentScreen.x);
              const y = Math.min(dragStartScreen.y, dragCurrentScreen.y);
              const w = Math.abs(dragCurrentScreen.x - dragStartScreen.x);
              const h = Math.abs(dragCurrentScreen.y - dragStartScreen.y);
              return (
                <div
                  style={{
                    position: "fixed",
                    left: x,
                    top: y,
                    width: w,
                    height: h,
                    border: "3px dashed #FFD700",
                    background: "rgba(255,215,0,0.12)",
                    boxShadow:
                      "0 0 0 2px rgba(255,215,0,0.4), inset 0 0 20px rgba(255,215,0,0.08)",
                    pointerEvents: "none",
                    zIndex: 2002,
                  }}
                >
                  {/* Corner markers */}
                  {[
                    [0, 0],
                    [w - 8, 0],
                    [0, h - 8],
                    [w - 8, h - 8],
                  ].map(([cx, cy], i) => (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        left: cx,
                        top: cy,
                        width: 8,
                        height: 8,
                        background: "#FFD700",
                        boxShadow: "0 0 6px #FFD700",
                      }}
                    />
                  ))}
                  {/* Size label */}
                  {w > 60 && h > 30 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%,-50%)",
                        fontFamily: "'Press Start 2P', monospace",
                        fontSize: 8,
                        color: "#FFD700",
                        textShadow: "0 0 8px #000, 1px 1px 0 #000",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {FARM_GRID.cols}×{FARM_GRID.rows} PLOTS
                    </div>
                  )}
                </div>
              );
            })()}
        </>
      )}

      {/* PREMIUM STYLED NOTIFICATIONS (STYLED LIKE CONNECT WALLET) */}
      {savedGridInfo && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 5000,
          }}
        >
          <div
            className="wood-panel gf"
            style={{
              padding: "10px 18px",
              fontSize: 7,
              color: "#FFD700",
              background: "rgba(30,15,5,0.97)",
              border: "2px solid #FFD700",
              borderRadius: 10,
              textAlign: "center",
              lineHeight: "1.8",
              boxShadow: "0 4px 20px rgba(0,0,0,0.8)",
            }}
          >
            <div style={{ marginBottom: 4, color: "#90EE90" }}>
              ✅ FARM GRID SAVED
            </div>
            <div>{savedGridInfo}</div>
            <button
              className="wb gf"
              style={{ marginTop: 8, fontSize: 6, padding: "4px 10px" }}
              onClick={() => setSavedGridInfo(null)}
            >
              TUTUP
            </button>
          </div>
        </div>
      )}



      {ds.notification && (
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 5000,
            pointerEvents: "none",
          }}
        >
          <div
            className="wb gf"
            style={{
              padding: "18px 36px",
              fontSize: 14,
              border: "4px solid #FFD700",
              color: "#FFD700",
              background: "rgba(62,39,23,0.95)",
              boxShadow: "0 15px 40px rgba(0,0,0,0.8)",
              textAlign: "center",
              animation: "pulse 1s infinite",
            }}
          >
            {ds.notification.text.toUpperCase()}
          </div>
        </div>
      )}
    </div>
  );
}
