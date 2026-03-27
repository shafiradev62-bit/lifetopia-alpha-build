import { useEffect, useMemo, useRef, useState } from "react";
import { MapType } from "../../game/Game";

type StoryStep = {
  id: string;
  title: string;
  map: MapType;
  durationMs: number;
  color: string;
  bubble: string;
  details: string[];
  detailPointers: { top: string; left: string }[];
};

interface PreFarmTutorialProps {
  visible: boolean;
  onFinished: () => void;
  onMapFocus?: (map: MapType) => void;
}

const STEPS: StoryStep[] = [
  {
    id: "farm",
    title: "FARM CORE LOOP",
    map: "home",
    durationMs: 0, 
    color: "#8BC34A",
    bubble: "Welcome to your FARM. Till soil, plant seeds, water, fertilize, then harvest for gold.",
    details: [
      "Select your HOE from the TOOLBAR at the bottom!",
      "Then click the SOIL GRID here to prepare the ground.",
      "Switch to SEEDS to start planting your first crop.",
      "Watch them grow, then HARVEST to earn GOLD!"
    ],
    detailPointers: [
      { top: '92%', left: '50%' }, // TOOLBAR HOE
      { top: '48%', left: '24%' }, // FARM GRID (START X: 197)
      { top: '92%', left: '50%' }, // TOOLBAR SEEDS
      { top: '48%', left: '24%' }  // FARM GRID
    ]
  },
  {
    id: "city",
    title: "CITY SHOP SYSTEM",
    map: "city",
    durationMs: 0,
    color: "#FFD54F",
    bubble: "This is the CITY. Buy seeds, tools, and supplies to scale your economy.",
    details: [
      "Visit the SHOP STALL area on the right.",
      "A [SHOP] button will appear here at the bottom center.",
      "Click it to open the market and buy new seeds!"
    ],
    detailPointers: [
      { top: '40%', left: '80%' }, // Shop Stall area
      { top: '82%', left: '50%' }, // Where [SHOP] button appears
      { top: '82%', left: '50%' }  // [SHOP] button logic
    ]
  },
  {
    id: "garden",
    title: "GARDEN SOCIAL HUB",
    map: "garden",
    durationMs: 0,
    color: "#80DEEA",
    bubble: "In GARDEN, you can meet other players, chill, and share progression moments.",
    details: [
      "Gather at the CENTRAL PLAZA to chat with fellow farmers.",
      "This is a multiplayer safe-zone for social roleplay."
    ],
    detailPointers: [
      { top: '55%', left: '50%' }, // Plaza
      { top: '55%', left: '50%' }  // Social area
    ]
  },
  {
    id: "fishing",
    title: "FISHING SIDE ACTIVITY",
    map: "fishing",
    durationMs: 0,
    color: "#64B5F6",
    bubble: "FISHING is your side income. Cast, wait for bite, then reel for rewards.",
    details: [
      "Head to the WATER EDGE on the left to start fishing.",
      "It's a great way to earn gold while waiting for crops."
    ],
    detailPointers: [
      { top: '65%', left: '42%' }, // Water
      { top: '65%', left: '42%' }  // Fishing area
    ]
  },
];

const MAP_BG: Record<MapType, string> = {
  home: "/home_1774349990715.jpg",
  city: "/map_city_new.png",
  fishing: "/map_fishing_new.png",
  garden: "/map_garden_new.png",
  suburban: "/map_suburban_1774358176142.png",
};

export default function PreFarmTutorial({
  visible,
  onFinished,
  onMapFocus,
}: PreFarmTutorialProps) {
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [detailIndex, setDetailIndex] = useState(-1);
  const [typedBubble, setTypedBubble] = useState("");
  const [idleFrame, setIdleFrame] = useState(1);
  const [finished, setFinished] = useState(false);

  const step = STEPS[Math.min(stepIndex, STEPS.length - 1)];

  // ANIMATION: Constant Idle Loop
  useEffect(() => {
    const itv = setInterval(() => {
      setIdleFrame(f => (f % 12) + 1);
    }, 120);
    return () => clearInterval(itv);
  }, []);

  useEffect(() => {
    if (!visible) return;
    setStarted(false);
    setStepIndex(0);
    setDetailIndex(-1);
    setTypedBubble("");
    setFinished(false);
    const t = setTimeout(() => setStarted(true), 320);
    return () => clearTimeout(t);
  }, [visible]);

  useEffect(() => {
    if (!visible || !started) return;
    onMapFocus?.(step.map);
  }, [visible, started, step.map, onMapFocus]);

  // TYPING EFFECT
  useEffect(() => {
    const coords = detailIndex === -1 ? { top: '50%', left: '50%' } : step.detailPointers[detailIndex];
    if (!coords) return;
    
    setTypedBubble("");
    let i = 0;
    const text = detailIndex === -1 ? step.bubble : step.details[detailIndex];
    if (!text) return;
    const t = setInterval(() => {
      i += 1;
      setTypedBubble(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, 18);
    return () => clearInterval(t);
  }, [visible, started, stepIndex, detailIndex, step.bubble, step.details, step.detailPointers]);

  const handleNext = () => {
    if (detailIndex < step.details.length - 1) {
      setDetailIndex(d => d + 1);
      return;
    }
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(i => i + 1);
      setDetailIndex(-1);
      return;
    }
    setFinished(true);
    onFinished();
  };

  const handleSkip = () => {
    setFinished(true);
    onFinished();
  };

  if (!visible || finished) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 9500,
        overflow: "hidden",
        pointerEvents: "auto",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        @keyframes pft-float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50% { transform: translate(-50%, -50%) translateY(-10px); }
        }
        .stardew-btn {
          font-family: 'Press Start 2P', monospace;
          background: #5C4033;
          border: 4px solid #8B5E3C;
          color: #FFD700;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 8px;
          box-shadow: 2px 2px 0 rgba(0,0,0,0.3);
        }
        .stardew-btn:hover { background: #8B5E3C; color: #FFF; }
        .stardew-btn:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0 rgba(0,0,0,0.3); }
        
        .hud-tray {
          background: linear-gradient(180deg, #A07844 0%, #7B502C 100%);
          padding: 10px 18px;
          border-radius: 40px;
          border: 4px solid #5C4033;
          box-shadow: 0 10px 0 rgba(0,0,0,0.5), inset 0 2px 8px rgba(255,255,255,0.25);
          display: flex; gap: 8px;
          position: absolute;
          bottom: 25px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
        }
        .hud-slot {
          width: 52px; height: 52px;
          background: linear-gradient(135deg, #8B5E3C 0%, #5E3A24 100%);
          border: 3px solid #4D2D18;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          position: relative;
        }
        .hud-header {
          position: absolute; top: 15px; left: 15px;
          background: rgba(0,0,0,0.6);
          border: 3px solid #5C4033;
          border-radius: 12px;
          padding: 10px 20px;
          color: #FFD700;
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          z-index: 10;
        }
      `}</style>

      {/* BACKGROUND MAP WITH DYNAMIC CAMERA FOCUS */}
      {(() => {
        const coords = detailIndex === -1 ? { top: '50%', left: '50%' } : step.detailPointers[detailIndex];
        const isToolFocus = coords && parseInt(coords.top) > 80;
        const isSideFocus = coords && (parseInt(coords.left) < 30 || parseInt(coords.left) > 70);
        const isDialogTop = coords && parseInt(coords.top) > 75;
        
        return (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${MAP_BG[step.map] || MAP_BG.home})`,
              backgroundSize: "cover",
              backgroundPosition: isToolFocus ? "center 90%" : isSideFocus ? `${coords?.left} center` : "center",
              transform: isToolFocus || isSideFocus ? "scale(1.15)" : "scale(1.05)",
              filter: isToolFocus || isSideFocus ? "brightness(1.05) contrast(1.02)" : "none",
              transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        );
      })()}

      {/* AUTHENTIC GAME HUD OVERLAY */}
      {/* hud-header REMOVED as requested */}
      
      {/* MAP-SPECIFIC SHOP BUTTON (Only in City) */}
      {step.map === "city" && (
        <div style={{
          position: 'absolute',
          bottom: 120,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(180deg, #CE9E64 0%, #8D5A32 100%)',
          border: '4px solid #5C4033',
          color: '#FFF5E0',
          padding: '12px 24px',
          borderRadius: 12,
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 10,
          boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
          zIndex: 10,
          animation: 'pft-float 1s ease-in-out infinite alternate'
        }}>
          [ E ] VISIT SHOP
        </div>
      )}

      <div className="hud-tray">
        <div className="hud-slot" style={{ borderColor: '#FFD700' }}><img src="/celurit_1774349990712.png" style={{ width: 34 }} /></div>
        <div className="hud-slot"><img src="/kapak_1_1774349990715.png" style={{ width: 34 }} /></div>
        <div className="hud-slot"><img src="/teko_siram.png" style={{ width: 34 }} /></div>
        <div className="hud-slot"><img src="/wheat.png" style={{ width: 34 }} /></div>
        <div className="hud-slot"><img src="/tomato.png" style={{ width: 34 }} /></div>
        <div className="hud-slot"><img src="/carrot.png" style={{ width: 34 }} /></div>
      </div>

      {/* MAP INTEREST POINT */}
      {(() => {
        const coords = detailIndex === -1 ? null : step.detailPointers[detailIndex];
        if (!coords) return null;
        return (
          <div
            className="pft-finger-pointer"
            style={{
              position: 'absolute',
              top: coords.top,
              left: coords.left,
              zIndex: 3,
              animation: 'pft-float 1.2s ease-in-out infinite alternate',
              pointerEvents: 'none',
              transition: 'all 0.4s ease',
              marginTop: -30,
              marginLeft: -30,
              // Use a hand/finger emoji pointing if Kapak is too weird
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 60,
              filter: 'drop-shadow(0 0 20px #FFD700)',
            }}
          >
            <img 
               src="/tangan.png" 
               style={{ 
                 width: 80, 
                 height: 80, 
                 imageRendering: 'pixelated',
                 transform: 'rotate(-45deg)',
                 filter: 'drop-shadow(0 0 15px #FFD700)'
               }} 
            />
          </div>
        );
      })()}

      {/* STARDEW VALLEY DIALOGUE BOX WITH SMART REPOSITIONING */}
      {(() => {
        const coords = detailIndex === -1 ? { top: '50%', left: '50%' } : step.detailPointers[detailIndex];
        const isBottomFocus = coords && parseInt(coords.top) > 75;
        
        return (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: isBottomFocus ? 40 : "auto",
              bottom: isBottomFocus ? "auto" : 40,
              transform: "translateX(-50%)",
              width: 1100,
              maxHeight: 280,
              background: "#f4c692", 
              border: "8px solid #5C4033", 
              borderRadius: 4,
              boxShadow: "0 20px 60px rgba(0,0,0,0.8), inset 0 0 0 4px #8B5E3C",
              display: "flex",
              zIndex: 100,
              overflow: "hidden",
              transition: "all 0.6s cubic-bezier(0.18, 0.89, 0.32, 1.28)" // Bouncy transition
            }}
          >
            <div style={{ width: 12, background: '#4a2c1a', borderRight: '4px solid #8B5E3C' }} />

            {/* DIALOGUE AREA */}
            <div style={{ flex: 1, padding: "30px", position: "relative", display: 'flex', flexDirection: 'column' }}>
              <div style={{
                  flex: 1,
                  fontSize: 14,
                  lineHeight: "1.8",
                  fontFamily: "'Press Start 2P', monospace",
                  color: "#3a2212",
                  textShadow: "1px 1px 0 rgba(255,255,255,0.4)"
                }}>
                {typedBubble}
              </div>

              <div style={{ display: 'flex', gap: 15, justifyContent: 'flex-end', marginTop: 10, position: 'relative', bottom: -10 }}>
                <button className="stardew-btn" onClick={handleSkip}>SKIP</button>
                <button className="stardew-btn" onClick={handleNext}>NEXT &gt;</button>
              </div>
            </div>

            {/* ANIMATED CHARACTER PORTRAIT BOX */}
            <div style={{ 
                width: 250, 
                borderLeft: '8px solid #5C4033', 
                background: '#e0b080',
                display: 'flex',
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                position: "relative"
            }}>
              <div style={{ 
                background: '#f4c692', 
                padding: 10, 
                border: '4px solid #5C4033',
                borderRadius: 4,
                marginBottom: 10,
                overflow: 'hidden',
                width: 160,
                height: 160,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* POINTING LOGIC: Use menanam_frames for home, characters for others */}
                <img 
                   src={(() => {
                     if (step.id === "home") {
                        const farmFrames = ["/farm_till.png", "/farm_plant.png", "/farm_water.png", "/farm_harvest.png"];
                        return farmFrames[detailIndex] || "/player_idle.png";
                     } else {
                        // For City/Mancing: use Hai/Wave pose from characters
                        return detailIndex === -1 ? "/player_idle.png" : "/player_wave.png";
                     }
                   })()} 
                   style={{ 
                     height: 140, 
                     imageRendering: 'pixelated',
                     transform: detailIndex === -1 ? 'scale(1.2)' : 'scale(1.3) translateX(-5px)',
                     transition: 'all 0.3s ease'
                   }} 
                />
              </div>
              <div style={{
                 background: '#3a2212',
                 color: '#FFF5E0',
                 padding: '4px 20px',
                 fontFamily: "'Press Start 2P', monospace",
                 fontSize: 9,
                 borderRadius: 4
              }}>
                CHIBI: INFO
              </div>
            </div>

            <div style={{ width: 12, background: '#4a2c1a', borderLeft: '4px solid #8B5E3C' }} />
          </div>
        );
      })()}
    </div>
  );
}
