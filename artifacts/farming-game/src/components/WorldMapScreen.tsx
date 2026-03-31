import { useState, useEffect, useRef, useCallback } from "react";
import type { MapType } from "../game/Game";

interface Props {
  onSelectMap: (map: MapType) => void;
  currentMap: MapType;
  playerLevel: number;
}

// Positions as % of image — adjust cx/cy to match sign locations in preview map.png
// r is click radius in % units (larger = easier to click)
const HOTSPOTS: {
  id: MapType;
  cx: number; cy: number;
  r: number;
  minLevel: number;
  label: string;
}[] = [
  { id: "home",     cx: 8,   cy: 30,  r: 9,  minLevel: 1, label: "Farm"     },
  { id: "suburban", cx: 38,  cy: 18,  r: 9,  minLevel: 1, label: "Suburban" },
  { id: "city",     cx: 88,  cy: 12,  r: 9,  minLevel: 1, label: "City"     },
  { id: "garden",   cx: 88,  cy: 62,  r: 9,  minLevel: 1, label: "Garden"   },
  { id: "fishing",  cx: 48,  cy: 80,  r: 9,  minLevel: 1, label: "Fishing"  },
];

type Phase = "idle" | "zooming" | "entering";

interface Leaf {
  id: number; x: number; y: number; vx: number; vy: number;
  rot: number; vrot: number; size: number; color: string; shape: number;
}

const LEAF_COLORS = [
  "#4CAF50","#66BB6A","#81C784","#A5D6A7",
  "#FFD54F","#FFCA28","#FF8A65","#8BC34A","#AED581",
];

export default function WorldMapScreen({ onSelectMap, playerLevel }: Props) {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState<MapType | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [selected, setSelected] = useState<typeof HOTSPOTS[0] | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const leavesRef = useRef<Leaf[]>([]);
  const leafIdRef = useRef(0);
  const animRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40);
    return () => {
      clearTimeout(t);
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const tick = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const now = performance.now();
    if (Math.random() < 0.06) {
      leavesRef.current.push({
        id: ++leafIdRef.current,
        x: Math.random() * W, y: -15,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 0.4 + Math.random() * 0.7,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.05,
        size: 7 + Math.random() * 11,
        color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
        shape: Math.floor(Math.random() * 3),
      });
    }
    leavesRef.current = leavesRef.current.filter(l => l.y < H + 20);
    for (const l of leavesRef.current) {
      l.x += l.vx + Math.sin(now / 1000 + l.id * 0.8) * 0.2;
      l.y += l.vy;
      l.rot += l.vrot + Math.sin(now / 700 + l.id) * 0.008;
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot);
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = l.color;
      if (l.shape === 0) {
        ctx.beginPath();
        ctx.ellipse(0, 0, l.size / 2, l.size / 3, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (l.shape === 1) {
        ctx.beginPath();
        ctx.moveTo(0, -l.size / 2);
        ctx.bezierCurveTo(l.size / 2, -l.size / 4, l.size / 2, l.size / 3, 0, l.size / 2);
        ctx.bezierCurveTo(-l.size / 2, l.size / 3, -l.size / 2, -l.size / 4, 0, -l.size / 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const r = i % 2 === 0 ? l.size / 2 : l.size / 4;
          i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    animRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [tick]);

  const getHit = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    for (const spot of HOTSPOTS) {
      if (spot.minLevel > playerLevel) continue;
      const dx = px - spot.cx, dy = py - spot.cy;
      // Use rectangular hitbox (wider than tall) for sign shape
      if (Math.abs(dx) < spot.r * 1.4 && Math.abs(dy) < spot.r * 0.8) return spot;
    }
    return null;
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (phase !== "idle") return;
    const spot = getHit(e);
    if (!spot) return;
    // Clear any pending timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setSelected(spot);
    setPhase("zooming");
    const t1 = setTimeout(() => setPhase("entering"), 450);
    const t2 = setTimeout(() => onSelectMap(spot.id), 800);
    timersRef.current = [t1, t2];
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (phase !== "idle") return;
    const spot = getHit(e);
    setHovered(spot ? spot.id : null);
  };

  const zoomStyle = (phase === "zooming" || phase === "entering") && selected ? {
    transform: `scale(3.5) translate(${(50 - selected.cx) * 0.286}%, ${(50 - selected.cy) * 0.286}%)`,
    transition: "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
    transformOrigin: `${selected.cx}% ${selected.cy}%`,
  } : {
    transform: "scale(1)",
    transition: "transform 0.3s ease",
    transformOrigin: "50% 50%",
  };

  const isZooming = phase !== "idle";
  const fadeOut = phase === "entering";

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 8000,
      opacity: visible ? 1 : 0,
      transition: "opacity 0.35s ease",
      cursor: hovered ? "pointer" : "default",
      overflow: "hidden",
    }}>
      {/* Map image + clickable sign overlays */}
      <div
        style={{ position: "absolute", inset: 0, overflow: "hidden", ...zoomStyle }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      >
        <img
          src="/preview map.png"
          alt="World Map"
          style={{
            width: "100%", height: "100%",
            display: "block",
            userSelect: "none",
            pointerEvents: "none",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />

        {/* Wooden sign overlays on each hotspot — invisible but clickable */}
        {HOTSPOTS.map(spot => {
          const locked = spot.minLevel > playerLevel;
          const isHov = hovered === spot.id && !locked;
          return (
            <div key={spot.id} style={{
              position: "absolute",
              left: `${spot.cx}%`,
              top: `${spot.cy}%`,
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              zIndex: 2,
            }}>
              {/* Invisible large hitbox area */}
              <div style={{
                width: 120,
                height: 70,
                position: "absolute",
                left: "50%", top: "50%",
                transform: "translate(-50%, -50%)",
                background: "transparent",
                cursor: locked ? "default" : "pointer",
              }} />

              {/* Pulse ring on hover only */}
              {isHov && (
                <div style={{
                  position: "absolute",
                  width: 80, height: 80,
                  borderRadius: "50%",
                  border: "2px solid rgba(255,215,0,0.8)",
                  left: "50%", top: "50%",
                  transform: "translate(-50%, -50%)",
                  animation: "wm-ring-pulse 0.9s ease-out infinite",
                  pointerEvents: "none",
                }} />
              )}
              {isHov && (
                <div style={{
                  position: "absolute",
                  width: 60, height: 60,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%)",
                  left: "50%", top: "50%",
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "none",
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Leaf canvas */}
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        style={{
          position: "absolute", inset: 0,
          pointerEvents: "none", zIndex: 3,
          opacity: isZooming ? 0 : 1,
          transition: "opacity 0.25s",
        }}
      />

      {/* Fade to black */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 20,
        background: "#000",
        opacity: fadeOut ? 1 : 0,
        transition: "opacity 0.35s ease",
        pointerEvents: "none",
      }} />

      <style>{`
        @keyframes wm-ring-pulse {
          0% { transform: translate(-50%,-50%) scale(0.85); opacity: 0.9; }
          100% { transform: translate(-50%,-50%) scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
