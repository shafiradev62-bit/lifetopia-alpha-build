import { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, MapType } from '../game/Game';
import { createInitialState, updateGame, handleToolAction } from '../game/GameEngine';
import { renderGame, preloadAssets } from '../game/Renderer';

const TOOLS = [
  { id: 'shovel', label: 'Shovel', emoji: '🪣', icon: null },
  { id: 'seed', label: 'Seeds', emoji: '🌱', icon: null },
  { id: 'tomato', label: 'Tomato', emoji: '🍅', icon: null },
  { id: 'water', label: 'Water', emoji: '💧', icon: null },
  { id: 'axe', label: 'Axe', icon: '/kapak_1774349990716.png' },
  { id: 'hoe', label: 'Hoe', icon: '/kapak_1_1774349990715.png' },
  { id: 'celurit', label: 'Sickle', icon: '/celurit_1774349990712.png' },
  { id: 'play', label: 'Run', emoji: '▶', icon: null },
];

const MAPS: { id: MapType; label: string; icon: string }[] = [
  { id: 'home', label: 'Farm', icon: '🏡' },
  { id: 'city', label: 'City', icon: '🏙️' },
  { id: 'fishing', label: 'Fishing', icon: '🎣' },
  { id: 'garden', label: 'Garden', icon: '🌺' },
];

export default function FarmingGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [displayState, setDisplayState] = useState<GameState>(stateRef.current);
  const [loaded, setLoaded] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);

  useEffect(() => {
    preloadAssets().then(() => setLoaded(true)).catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const TOOL_ORDER = ['shovel', 'seed', 'tomato', 'water', 'axe', 'hoe', 'celurit', 'play'];
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      stateRef.current.keys.add(key);
      if (key === ' ' || key === 'e' || key === 'enter') {
        stateRef.current = handleToolAction(stateRef.current);
      }
      if (key === 'escape') {
        stateRef.current.shopOpen = false;
        stateRef.current.inventoryOpen = false;
        stateRef.current.questsOpen = false;
        setActivePanel(null);
      }
      if (key === '=' || key === '+') {
        stateRef.current.targetZoom = Math.min(stateRef.current.targetZoom + 0.25, 3);
      }
      if (key === '-') {
        stateRef.current.targetZoom = Math.max(stateRef.current.targetZoom - 0.25, 0.75);
      }
      const num = parseInt(e.key);
      if (num >= 1 && num <= 8) {
        const toolId = TOOL_ORDER[num - 1];
        if (toolId === 'play') {
          stateRef.current.player.speed = stateRef.current.player.speed === 3 ? 6 : 3;
        } else {
          stateRef.current.player.tool = toolId as GameState['player']['tool'];
          setDisplayState(prev => ({ ...prev, player: { ...prev.player, tool: toolId as GameState['player']['tool'] } }));
        }
      }
      if (key === 'tab') {
        const mapOrder: MapType[] = ['home', 'city', 'fishing', 'garden'];
        const idx = mapOrder.indexOf(stateRef.current.currentMap);
        const nextMap = mapOrder[(idx + 1) % mapOrder.length];
        switchMap(nextMap);
      }
      const navKeys = ['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','e','enter','tab'];
      if (navKeys.includes(key) || (num >= 1 && num <= 8)) e.preventDefault();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loaded) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTimeRef.current) || 16, 32);
      lastTimeRef.current = timestamp;

      stateRef.current = updateGame(stateRef.current, dt);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      renderGame(ctx, stateRef.current, canvas.width, canvas.height);

      if (Math.floor(timestamp / 100) !== Math.floor((timestamp - dt) / 100)) {
        setDisplayState({ ...stateRef.current });
      }

      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [loaded]);

  const selectTool = useCallback((toolId: string) => {
    if (toolId === 'play') {
      stateRef.current.player.speed = stateRef.current.player.speed === 3 ? 6 : 3;
      return;
    }
    stateRef.current.player.tool = toolId as GameState['player']['tool'];
    setDisplayState(prev => ({ ...prev, player: { ...prev.player, tool: toolId as GameState['player']['tool'] } }));
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    stateRef.current = handleToolAction(stateRef.current);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    stateRef.current.targetZoom = Math.max(0.75, Math.min(3, stateRef.current.targetZoom + delta));
    e.preventDefault();
  }, []);

  const switchMap = useCallback((mapId: MapType) => {
    stateRef.current.currentMap = mapId;
    stateRef.current.cameraX = 0;
    stateRef.current.cameraY = 0;
    if (mapId === 'home') {
      stateRef.current.player.x = 820;
      stateRef.current.player.y = 480;
    } else if (mapId === 'city') {
      stateRef.current.player.x = 900;
      stateRef.current.player.y = 350;
    } else if (mapId === 'fishing') {
      stateRef.current.player.x = 750;
      stateRef.current.player.y = 400;
    } else if (mapId === 'garden') {
      stateRef.current.player.x = 800;
      stateRef.current.player.y = 375;
    }
    setDisplayState(prev => ({ ...prev, currentMap: mapId }));
  }, []);

  const hpPercent = displayState.player.hp / displayState.player.maxHp;

  return (
    <div className="game-wrapper">
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; overflow: hidden; }
        .game-wrapper {
          position: relative;
          width: 1280px;
          height: 720px;
          margin: 0 auto;
          overflow: hidden;
          font-family: 'Press Start 2P', 'Courier New', monospace;
        }
        @media (max-width: 1280px) {
          .game-wrapper {
            transform-origin: top left;
            transform: scale(calc(100vw / 1280));
            width: 1280px;
            height: 720px;
          }
        }
        canvas { display: block; }

        /* HUD */
        .hud-left {
          position: absolute;
          top: 10px;
          left: 10px;
          width: 210px;
          background: rgba(20, 12, 4, 0.88);
          border: 3px solid #8B6914;
          border-radius: 8px;
          padding: 10px;
          color: #FFF;
          font-size: 9px;
          box-shadow: 0 0 15px rgba(139,105,20,0.5);
        }
        .hud-level { font-size: 12px; color: #FFD700; font-weight: bold; margin-bottom: 8px; }
        .hp-bar-bg {
          background: #3a1a1a; border: 1px solid #8B0000;
          border-radius: 4px; height: 12px; margin-bottom: 6px; overflow: hidden;
        }
        .hp-bar-fill {
          height: 100%; border-radius: 3px;
          background: linear-gradient(90deg, #FF4444, #FF6666);
          transition: width 0.3s;
          box-shadow: 0 0 8px #FF4444;
        }
        .hp-text { color: #FF8888; font-size: 8px; margin-bottom: 8px; }
        .exp-bar-bg {
          background: #1a1a3a; border: 1px solid #00008B;
          border-radius: 4px; height: 6px; margin-bottom: 8px; overflow: hidden;
        }
        .exp-bar-fill {
          height: 100%; background: linear-gradient(90deg, #4444FF, #8888FF);
          border-radius: 3px;
        }

        .quest-section { border-top: 1px solid #8B6914; padding-top: 8px; margin-top: 4px; }
        .quest-label { color: #FFD700; font-size: 8px; margin-bottom: 4px; }
        .quest-mode { color: #DEB887; font-size: 7px; margin-bottom: 6px; }
        .quest-item { color: #FFF; font-size: 7px; margin-bottom: 3px; padding-left: 4px; line-height: 1.4; }
        .quest-item.done { color: #90EE90; text-decoration: line-through; }

        /* Top right buttons */
        .hud-top-right {
          position: absolute;
          top: 10px;
          right: 10px;
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .hud-btn {
          background: linear-gradient(180deg, #C8A040 0%, #8B6914 100%);
          border: 2px solid #4a3008;
          color: #FFF;
          font-family: inherit;
          font-size: 8px;
          padding: 6px 10px;
          cursor: pointer;
          border-radius: 6px;
          box-shadow: 0 3px 0 #4a3008, inset 0 1px 0 rgba(255,255,255,0.3);
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
          transition: all 0.1s;
          white-space: nowrap;
        }
        .hud-btn:hover { background: linear-gradient(180deg, #E0B850 0%, #A07820 100%); transform: translateY(-1px); }
        .hud-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 #4a3008; }
        .hud-btn.wallet { background: linear-gradient(180deg, #40A0C8 0%, #1460A0 100%); border-color: #0a3060; box-shadow: 0 3px 0 #0a3060, inset 0 1px 0 rgba(255,255,255,0.3); }
        .hud-btn.claim { background: linear-gradient(180deg, #C84040 0%, #A01414 100%); border-color: #600a0a; box-shadow: 0 3px 0 #600a0a, inset 0 1px 0 rgba(255,255,255,0.3); }
        .gold-display {
          background: linear-gradient(180deg, #FFD700 0%, #C8A000 100%);
          border: 2px solid #4a3008;
          color: #3a2000;
          font-family: inherit;
          font-size: 9px;
          font-weight: bold;
          padding: 6px 10px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
          box-shadow: 0 3px 0 #4a3008;
        }
        .settings-btn {
          background: rgba(50,40,20,0.8);
          border: 2px solid #8B6914;
          color: #FFD700;
          font-size: 14px;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Bottom toolbar */
        .toolbar {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
          background: linear-gradient(180deg, #8B6914 0%, #5a4208 100%);
          border: 3px solid #4a3008;
          border-radius: 12px;
          padding: 8px 10px;
          box-shadow: 0 -2px 0 #C8A040 inset, 0 4px 12px rgba(0,0,0,0.6);
        }
        .tool-slot {
          width: 58px;
          height: 58px;
          background: linear-gradient(180deg, #C8A040 0%, #8B6914 100%);
          border: 2px solid #4a3008;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          font-family: inherit;
          color: #FFF;
          font-size: 7px;
          box-shadow: 0 3px 0 #4a3008, inset 0 1px 0 rgba(255,255,255,0.2);
          transition: all 0.1s;
          position: relative;
          overflow: hidden;
        }
        .tool-slot:hover { background: linear-gradient(180deg, #E0B850 0%, #A07820 100%); transform: translateY(-3px); }
        .tool-slot:active { transform: translateY(1px); }
        .tool-slot.active {
          background: linear-gradient(180deg, #FFD700 0%, #C8A000 100%);
          border-color: #FFD700;
          box-shadow: 0 0 12px #FFD700, 0 3px 0 #8B6914, inset 0 1px 0 rgba(255,255,255,0.4);
        }
        .tool-slot img { width: 32px; height: 32px; object-fit: contain; image-rendering: pixelated; }
        .tool-emoji { font-size: 24px; line-height: 1; }
        .tool-key {
          position: absolute;
          top: 2px;
          right: 3px;
          font-size: 6px;
          color: rgba(255,255,255,0.6);
        }

        /* Map switcher */
        .map-switcher {
          position: absolute;
          bottom: 10px;
          right: 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .map-btn {
          background: linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 100%);
          border: 2px solid #8B6914;
          color: #FFF;
          font-family: inherit;
          font-size: 8px;
          padding: 5px 10px;
          cursor: pointer;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
          box-shadow: 0 2px 0 #1a1a1a;
          transition: all 0.1s;
        }
        .map-btn:hover { background: linear-gradient(180deg, #6a6a6a 0%, #4a4a4a 100%); }
        .map-btn.active { background: linear-gradient(180deg, #C8A040 0%, #8B6914 100%); border-color: #FFD700; }

        /* Notification */
        .notification {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -120px);
          background: rgba(0,0,0,0.85);
          border: 2px solid #FFD700;
          color: #FFD700;
          font-family: inherit;
          font-size: 11px;
          padding: 8px 16px;
          border-radius: 8px;
          pointer-events: none;
          text-align: center;
          box-shadow: 0 0 20px rgba(255,215,0,0.4);
          animation: notifFadeIn 0.2s ease;
        }
        @keyframes notifFadeIn { from { opacity: 0; transform: translate(-50%, -100px); } to { opacity: 1; transform: translate(-50%, -120px); } }

        /* Hint bar */
        .hint-bar {
          position: absolute;
          bottom: 90px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.65);
          color: rgba(255,255,255,0.7);
          font-size: 7px;
          padding: 4px 12px;
          border-radius: 20px;
          white-space: nowrap;
          font-family: inherit;
          pointer-events: none;
        }

        /* Panel overlays */
        .panel-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
        }
        .panel {
          background: linear-gradient(180deg, #2a1a06 0%, #1a0e04 100%);
          border: 3px solid #8B6914;
          border-radius: 12px;
          padding: 20px;
          min-width: 360px;
          max-width: 480px;
          color: #FFF;
          font-family: inherit;
          font-size: 9px;
          box-shadow: 0 0 30px rgba(139,105,20,0.6);
        }
        .panel-title {
          color: #FFD700;
          font-size: 13px;
          text-align: center;
          margin-bottom: 16px;
          text-shadow: 0 0 10px #FFD700;
        }
        .panel-close {
          float: right;
          background: #8B0000;
          border: 1px solid #CC0000;
          color: #FFF;
          font-family: inherit;
          font-size: 9px;
          padding: 3px 8px;
          cursor: pointer;
          border-radius: 4px;
        }
        .quest-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid #8B6914;
          border-radius: 6px;
          padding: 8px 10px;
          margin-bottom: 8px;
        }
        .quest-card.done { border-color: #4CAF50; opacity: 0.6; }
        .quest-title { color: #FFD700; font-size: 9px; margin-bottom: 4px; }
        .quest-desc { color: #DEB887; font-size: 7px; margin-bottom: 4px; }
        .quest-progress { color: #90EE90; font-size: 7px; }
        .quest-reward { float: right; color: #FFD700; }
        .inv-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-top: 12px;
        }
        .inv-slot {
          background: rgba(255,255,255,0.05);
          border: 1px solid #8B6914;
          border-radius: 6px;
          padding: 8px;
          text-align: center;
        }
        .inv-name { color: #DEB887; font-size: 7px; margin-bottom: 4px; }
        .inv-count { color: #FFD700; font-size: 12px; }

        /* Zoom indicator */
        .zoom-indicator {
          position: absolute;
          bottom: 90px;
          right: 10px;
          background: rgba(0,0,0,0.6);
          border: 1px solid #8B6914;
          border-radius: 6px;
          padding: 4px 8px;
          color: #FFD700;
          font-size: 8px;
          font-family: inherit;
        }

        /* Loading */
        .loading-screen {
          position: absolute;
          inset: 0;
          background: #0a0a1a;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }
        .loading-title { color: #FFD700; font-family: inherit; font-size: 20px; text-shadow: 0 0 20px #FFD700; }
        .loading-sub { color: #DEB887; font-family: inherit; font-size: 9px; }
        .loading-spinner {
          width: 40px; height: 40px;
          border: 3px solid #4a3008;
          border-top-color: #FFD700;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Control hints */
        .control-hint {
          position: absolute;
          bottom: 90px;
          left: 10px;
          color: rgba(255,255,255,0.5);
          font-size: 7px;
          font-family: inherit;
          line-height: 1.7;
        }
      `}</style>

      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        onClick={handleCanvasClick}
        onWheel={handleWheel}
        style={{ cursor: 'crosshair', display: 'block' }}
      />

      {!loaded && (
        <div className="loading-screen">
          <div className="loading-title">LIFETOPIA WORLD</div>
          <div className="loading-spinner" />
          <div className="loading-sub">Loading assets...</div>
        </div>
      )}

      {/* HUD Left Panel */}
      <div className="hud-left">
        <div className="hud-level">LVL {displayState.player.level}</div>
        <div className="hp-bar-bg">
          <div className="hp-bar-fill" style={{ width: `${hpPercent * 100}%` }} />
        </div>
        <div className="hp-text">HP {displayState.player.hp}/{displayState.player.maxHp}</div>
        <div className="exp-bar-bg">
          <div className="exp-bar-fill" style={{ width: `${(displayState.player.exp / displayState.player.maxExp) * 100}%` }} />
        </div>

        <div className="quest-section">
          <div className="quest-label">Classic</div>
          <div className="quest-mode">Reach Level: {displayState.player.level + 1}</div>
          <div className="quest-mode">Earn {displayState.player.level * 150} GOLD</div>
          <div style={{ color: '#FFD700', fontSize: '7px', marginBottom: '4px', marginTop: '4px' }}>SEASONAL QUESTS</div>
          {displayState.quests.slice(0, 4).map(q => (
            <div key={q.id} className={`quest-item ${q.completed ? 'done' : ''}`}>
              {q.title}: ({Math.min(q.current, q.target)}/{q.target})
            </div>
          ))}
        </div>
      </div>

      {/* Top Right Buttons */}
      <div className="hud-top-right">
        <button className="hud-btn wallet" onClick={() => setActivePanel('wallet')}>OPTIONAL WALLET</button>
        <button className="hud-btn" onClick={() => setActivePanel('quests')}>QUESTS</button>
        <button className="hud-btn" onClick={() => setActivePanel('inventory')}>ITEM</button>
        <button className="hud-btn claim" onClick={() => setActivePanel('nft')}>CLAIM NFT</button>
        <div className="gold-display">G {displayState.player.gold}</div>
        <button className="settings-btn" onClick={() => setActivePanel('settings')}>⚙</button>
      </div>

      {/* Bottom Toolbar */}
      <div className="toolbar">
        {TOOLS.map((tool, i) => (
          <div
            key={tool.id}
            className={`tool-slot ${displayState.player.tool === tool.id ? 'active' : ''}`}
            onClick={() => selectTool(tool.id)}
            title={tool.label}
          >
            <span className="tool-key">{i + 1}</span>
            {tool.icon ? (
              <img src={tool.icon} alt={tool.label} />
            ) : (
              <span className="tool-emoji">{tool.emoji}</span>
            )}
            <span style={{ fontSize: '6px' }}>{tool.label}</span>
          </div>
        ))}
      </div>

      {/* Map Switcher */}
      <div className="map-switcher">
        {MAPS.map(m => (
          <button
            key={m.id}
            className={`map-btn ${displayState.currentMap === m.id ? 'active' : ''}`}
            onClick={() => switchMap(m.id)}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Zoom indicator */}
      <div className="zoom-indicator">
        🔍 {Math.round(displayState.zoom * 100)}%
        <div style={{ fontSize: '6px', marginTop: '2px', color: '#DEB887' }}>Scroll / ±</div>
      </div>

      {/* Hint bar */}
      <div className="hint-bar">
        WASD: Move | E/Space/Click: Use Tool | Scroll: Zoom | 1-8: Tools | Tab: Map
      </div>

      {/* Control hint bottom left */}
      <div className="control-hint">
        <div>🪣 Shovel: Till/Harvest</div>
        <div>🌱 Seeds: Plant wheat</div>
        <div>🍅 Tomato: Plant tomato</div>
        <div>💧 Water: Water crops</div>
        <div>🪓 Axe: Chop trees</div>
      </div>

      {/* Notification */}
      {displayState.notification && (
        <div className="notification" style={{ opacity: Math.min(displayState.notification.life / 30, 1) }}>
          {displayState.notification.text}
        </div>
      )}

      {/* Panel Overlays */}
      {activePanel && (
        <div className="panel-overlay" onClick={(e) => { if (e.target === e.currentTarget) setActivePanel(null); }}>
          {activePanel === 'quests' && (
            <div className="panel">
              <button className="panel-close" onClick={() => setActivePanel(null)}>✕ CLOSE</button>
              <div className="panel-title">📋 QUESTS</div>
              {displayState.quests.map(q => (
                <div key={q.id} className={`quest-card ${q.completed ? 'done' : ''}`}>
                  <div className="quest-title">{q.completed ? '✅' : '📌'} {q.title}</div>
                  <div className="quest-desc">{q.description}</div>
                  <div className="quest-progress">
                    Progress: {Math.min(q.current, q.target)}/{q.target}
                    <span className="quest-reward">🪙 {q.reward} GOLD</span>
                  </div>
                  {!q.completed && (
                    <div style={{ marginTop: '4px', background: '#1a1a1a', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(q.current / q.target, 1) * 100}%`, background: '#FFD700' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {activePanel === 'inventory' && (
            <div className="panel">
              <button className="panel-close" onClick={() => setActivePanel(null)}>✕ CLOSE</button>
              <div className="panel-title">🎒 INVENTORY</div>
              <div style={{ color: '#DEB887', marginBottom: '8px' }}>Gold: {displayState.player.gold} G</div>
              <div className="inv-grid">
                {Object.entries(displayState.player.inventory).map(([key, val]) => (
                  <div key={key} className="inv-slot">
                    <div className="inv-name">{key.replace('-', ' ')}</div>
                    <div className="inv-count">{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activePanel === 'wallet' && (
            <div className="panel">
              <button className="panel-close" onClick={() => setActivePanel(null)}>✕ CLOSE</button>
              <div className="panel-title">👛 WALLET</div>
              <div style={{ color: '#DEB887', textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '24px', marginBottom: '12px' }}>💰</div>
                <div>Solana Devnet Integration</div>
                <div style={{ marginTop: '12px', color: '#90EE90' }}>Gold Balance: {displayState.player.gold} G</div>
                <div style={{ marginTop: '8px', fontSize: '7px', color: '#888' }}>Wallet connect available in full release</div>
              </div>
            </div>
          )}
          {activePanel === 'nft' && (
            <div className="panel">
              <button className="panel-close" onClick={() => setActivePanel(null)}>✕ CLOSE</button>
              <div className="panel-title">🏆 CLAIM NFT</div>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎖️</div>
                <div style={{ color: '#FFD700', marginBottom: '8px' }}>Alpha Tester NFT</div>
                <div style={{ color: '#DEB887', fontSize: '7px', marginBottom: '16px' }}>Complete quests to unlock NFT rewards!</div>
                <div style={{ color: '#90EE90', fontSize: '7px' }}>
                  Quests done: {displayState.quests.filter(q => q.completed).length}/{displayState.quests.length}
                </div>
                {displayState.quests.filter(q => q.completed).length >= 3 && (
                  <button style={{
                    marginTop: '12px',
                    background: 'linear-gradient(180deg, #FFD700, #C8A000)',
                    border: '2px solid #8B6914',
                    borderRadius: '6px',
                    color: '#3a2000',
                    fontFamily: 'inherit',
                    fontSize: '9px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                  }}>
                    CLAIM NFT (3 Quests Done!)
                  </button>
                )}
              </div>
            </div>
          )}
          {activePanel === 'settings' && (
            <div className="panel">
              <button className="panel-close" onClick={() => setActivePanel(null)}>✕ CLOSE</button>
              <div className="panel-title">⚙️ SETTINGS</div>
              <div style={{ color: '#DEB887' }}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ marginBottom: '4px' }}>Zoom: {Math.round(displayState.zoom * 100)}%</div>
                  <input type="range" min="75" max="300" step="25"
                    value={Math.round(displayState.targetZoom * 100)}
                    onChange={e => { stateRef.current.targetZoom = Number(e.target.value) / 100; }}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ fontSize: '7px', lineHeight: '1.8', marginTop: '12px' }}>
                  <div><b>WASD</b> — Move character</div>
                  <div><b>E / Space / Click</b> — Use tool on nearest plot</div>
                  <div><b>Scroll</b> — Zoom in/out</div>
                  <div><b>+/-</b> — Zoom in/out</div>
                  <div><b>1-8</b> — Select tool slot</div>
                  <div><b>ESC</b> — Close panels</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
