import { useState, useRef } from "react";
import type { GameState } from "../game/Game";

interface ToolDef {
  id: string;
  label: string;
  img: string;
}

interface Props {
  ds: GameState;
  tools: readonly ToolDef[];
  onSelectTool: (id: string) => void;
  onOpenInventory: () => void;
  onOpenMap: (id: string) => void;
  currentMap: string;
  maps: { id: string; label: string }[];
  gold: number;
  level: number;
  onOpenPanel: (panel: string) => void;
  claimableCount: number;
  boostCharges?: number;
  onBoost?: () => void;
}

const MAPS_LABELS: Record<string, string> = {
  home: "FARM",
  city: "CITY",
  fishing: "FISH",
  garden: "PARK",
  suburban: "SUB",
};

export default function MobileHUD({
  ds,
  tools,
  onSelectTool,
  onOpenInventory,
  onOpenMap,
  currentMap,
  maps,
  gold,
  level,
  onOpenPanel,
  claimableCount,
  boostCharges = 0,
  onBoost,
}: Props) {
  const [invOpen, setInvOpen] = useState(false);
  const invStartY = useRef(0);
  const invDragY = useRef(0);

  // Bottom sheet swipe
  const onInvTouchStart = (e: React.TouchEvent) => {
    invStartY.current = e.touches[0].clientY;
  };
  const onInvTouchMove = (e: React.TouchEvent) => {
    invDragY.current = e.touches[0].clientY - invStartY.current;
  };
  const onInvTouchEnd = () => {
    if (invDragY.current > 60) setInvOpen(false);
    else if (invDragY.current < -60) setInvOpen(true);
    invDragY.current = 0;
  };

  const activeTool = ds.player.tool;

  return (
    <>
      {/* ── TOP STATUS BAR ── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        padding: "env(safe-area-inset-top, 8px) 12px 8px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "linear-gradient(180deg, rgba(62,39,23,0.95) 0%, rgba(62,39,23,0) 100%)",
        zIndex: 1200, pointerEvents: "none",
      }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div className="wb gf" style={{ fontSize: 7, padding: "5px 10px", pointerEvents: "none" }}>
            LVL {level}
          </div>
          <div className="wb gf" style={{ fontSize: 7, padding: "5px 10px", color: "#FFFFFF", pointerEvents: "none" }}>
            G {gold}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, pointerEvents: "auto" }}>
          <button className="wb gf" style={{ fontSize: 6, padding: "5px 8px" }} onClick={() => onOpenPanel("wallet")}>
            WALLET
          </button>
          <button className="wb gf" style={{ fontSize: 6, padding: "5px 8px", position: "relative" }} onClick={() => onOpenPanel("quests")}>
            TASKS
            {claimableCount > 0 && (
              <span style={{ position: "absolute", top: -4, right: -4, background: "#FF4444", borderRadius: "50%", width: 14, height: 14, fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontFamily: "monospace" }}>
                {claimableCount}
              </span>
            )}
          </button>
          <button className="wb gf" style={{ fontSize: 6, padding: "5px 8px" }} onClick={() => onOpenPanel("settings")}>
            SET
          </button>
        </div>
      </div>

      {/* ── RIGHT SIDE TOOL RING (Thumb Zone) ── */}
      {currentMap === "home" && (
        <div style={{
          position: "absolute",
          right: 12,
          bottom: 120,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 1200,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}>
          {tools.slice(0, 4).map((t) => (
            <button
              key={t.id}
              onClick={() => onSelectTool(t.id)}
              style={{
                width: 52, height: 52,
                borderRadius: "50%",
                background: activeTool === t.id
                  ? "linear-gradient(135deg, #FFE4B5 0%, #D4AF37 100%)"
                  : "linear-gradient(135deg, #8B5E3C 0%, #5E3A24 100%)",
                border: activeTool === t.id ? "3px solid #FFF" : "3px solid #4D2D18",
                boxShadow: activeTool === t.id
                  ? "0 0 16px rgba(255,215,0,0.7), inset 0 0 4px #FFF"
                  : "0 4px 8px rgba(0,0,0,0.5), inset 0 0 8px rgba(0,0,0,0.6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.12s ease",
                transform: activeTool === t.id ? "scale(1.12)" : "scale(1)",
              }}
            >
              <img src={t.img} alt={t.label} style={{ width: 32, height: 32, objectFit: "contain", imageRendering: "pixelated" }} />
            </button>
          ))}
          {/* BOOST button */}
          <button
            onClick={onBoost}
            style={{
              width: 52, height: 52,
              borderRadius: "50%",
              background: boostCharges > 0
                ? "linear-gradient(135deg, #FFE4B5 0%, #C8A020 100%)"
                : "linear-gradient(135deg, #5A4030 0%, #3A2010 100%)",
              border: boostCharges > 0 ? "3px solid #FFD700" : "3px solid #4D2D18",
              boxShadow: boostCharges > 0 ? "0 0 12px rgba(255,215,0,0.5)" : "inset 0 0 8px rgba(0,0,0,0.6)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              cursor: boostCharges > 0 ? "pointer" : "not-allowed",
              opacity: boostCharges > 0 ? 1 : 0.5,
            }}
          >
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 5, color: boostCharges > 0 ? "#3E2723" : "#888", textAlign: "center", lineHeight: 1.4 }}>
              BOOST<br/>{boostCharges}/3
            </div>
          </button>
        </div>
      )}

      {/* ── BOTTOM MAP SELECTOR ── */}
      <div style={{
        position: "absolute",
        bottom: `calc(env(safe-area-inset-bottom, 0px) + 8px)`,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 6,
        zIndex: 1200,
        background: "linear-gradient(180deg, #A07844 0%, #7B502C 100%)",
        padding: "8px 12px",
        borderRadius: 40,
        border: "3px solid #5C4033",
        boxShadow: "0 8px 0 rgba(0,0,0,0.5)",
      }}>
        {maps.map((m) => (
          <button
            key={m.id}
            onClick={() => onOpenMap(m.id)}
            style={{
              width: 44, height: 44,
              borderRadius: "50%",
              background: currentMap === m.id
                ? "linear-gradient(180deg, #FFD700 0%, #C8A020 100%)"
                : "linear-gradient(135deg, #8B5E3C 0%, #5E3A24 100%)",
              border: currentMap === m.id ? "2px solid #FFF" : "2px solid #4D2D18",
              fontSize: 6,
              fontFamily: "'Press Start 2P', monospace",
              color: currentMap === m.id ? "#3E2723" : "#FFFFFF",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              boxShadow: currentMap === m.id ? "0 0 12px rgba(255,215,0,0.6)" : "0 2px 4px rgba(0,0,0,0.4)",
              transition: "all 0.12s",
              textShadow: currentMap === m.id ? "none" : "1px 1px 0 #000",
            }}
          >
            {MAPS_LABELS[m.id] || m.label.slice(0, 4)}
          </button>
        ))}
        {/* Inventory drawer trigger */}
        <button
          onClick={() => setInvOpen(true)}
          style={{
            width: 44, height: 44,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #8B5E3C 0%, #5D3A24 100%)",
            border: "2px solid #FFFFFF",
            fontSize: 6,
            fontFamily: "'Press Start 2P', monospace",
            color: "#FFFFFF",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
            textShadow: "1px 1px 0 #000",
          }}
        >
          INV
        </button>
      </div>

      {/* ── BOTTOM SHEET INVENTORY ── */}
      <div
        onTouchStart={onInvTouchStart}
        onTouchMove={onInvTouchMove}
        onTouchEnd={onInvTouchEnd}
        style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          height: invOpen ? "55%" : 0,
          background: "linear-gradient(180deg, #CE9E64 0%, #8D5A32 100%)",
          border: "4px solid #5C4033",
          borderRadius: "20px 20px 0 0",
          transition: "height 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
          zIndex: 1500,
          boxShadow: "0 -8px 30px rgba(0,0,0,0.6)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: 40, height: 5, background: "#5C4033", borderRadius: 3, opacity: 0.6 }} />
        </div>
        <div className="gf" style={{ textAlign: "center", fontSize: 8, color: "#FFD700", padding: "4px 0 10px", textShadow: "1px 1px #000" }}>
          INVENTORY
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 8,
          padding: "0 12px",
          overflowY: "auto",
          maxHeight: "calc(100% - 70px)",
        }}>
          {Object.entries(ds.player.inventory).filter(([, v]) => v > 0).map(([key, qty]) => (
            <div key={key} style={{
              background: "linear-gradient(135deg, #8B5E3C 0%, #5E3A24 100%)",
              border: "2px solid #4D2D18",
              borderRadius: "50%",
              width: 52, height: 52,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              boxShadow: "inset 0 0 8px rgba(0,0,0,0.6)",
            }}>
              <div className="gf" style={{ fontSize: 5, color: "#FFE4B5", textAlign: "center", lineHeight: 1.2 }}>
                {key.replace("-seed", "").toUpperCase().slice(0, 5)}
              </div>
              <div className="gf" style={{ fontSize: 8, color: "#FFD700" }}>x{qty}</div>
            </div>
          ))}
          {Object.entries(ds.player.inventory).filter(([, v]) => v > 0).length === 0 && (
            <div className="gf" style={{ gridColumn: "1/-1", textAlign: "center", fontSize: 7, color: "#8B5E3C", padding: 20 }}>
              INVENTORY EMPTY
            </div>
          )}
        </div>
      </div>

      {/* Overlay to close inventory */}
      {invOpen && (
        <div
          onClick={() => setInvOpen(false)}
          style={{ position: "absolute", inset: 0, zIndex: 1400, background: "rgba(0,0,0,0.3)" }}
        />
      )}
    </>
  );
}
