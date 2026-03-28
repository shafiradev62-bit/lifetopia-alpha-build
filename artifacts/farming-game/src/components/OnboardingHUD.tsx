import { useEffect, useRef, useState } from "react";

// tangan.png: fingers point UP.
// rotate(180deg) = points DOWN  → use to point at something below the hand
// rotate(90deg)  = points RIGHT → use to point at something to the right
// rotate(-90deg) = points LEFT  → use to point at something to the left
// rotate(0deg)   = points UP    → use to point at something above the hand

interface OnboardingHUDProps {
  currentTool: string | null;
  farmPlots: { tilled: boolean; watered: boolean; crop: any | null }[];
  onDismiss: () => void;
}

type Step = {
  id: string;
  title: string;
  desc: string;
  // Which toolbar slot to highlight (0-indexed). -1 = none.
  toolSlot: number;
  // Where to point the hand (% of 1280x720). null = no hand.
  handTarget: { x: number; y: number } | null;
  // Direction the fingertip points toward the target
  handDir: "down" | "right" | "left" | "up";
  // Condition to auto-advance to next step
  done: (tool: string | null, plots: { tilled: boolean; watered: boolean; crop: any | null }[]) => boolean;
};

// Toolbar slot pixel centers (% of 1280 wide canvas)
// Tray is centered, 8 slots × 60px + 7×8px gap + 36px padding = ~556px wide
// Center = 640px. Slot 0 starts at 640 - 278 + 18 = 380px
const SLOT_X = [29.7, 34.4, 39.1, 43.8, 51.9, 56.6, 61.3, 66.0]; // % of 1280
const TOOLBAR_Y = 91.5; // % of 720 — center of toolbar slots

const STEPS: Step[] = [
  {
    id: "select-hoe",
    title: "1. SELECT THE HOE",
    desc: "Click slot [1] — the HOE (celurit). Use it to till soil and harvest crops.",
    toolSlot: 0,
    handTarget: { x: SLOT_X[0], y: TOOLBAR_Y },
    handDir: "down",
    done: (tool) => tool === "sickle",
  },
  {
    id: "till-soil",
    title: "2. TILL THE SOIL",
    desc: "Click any dark soil plot on the farm grid to prepare it for planting.",
    toolSlot: 0,
    handTarget: { x: 22, y: 50 },
    handDir: "right",
    done: (_, plots) => plots.some(p => p.tilled),
  },
  {
    id: "select-wheat",
    title: "3. SELECT WHEAT SEED",
    desc: "Click slot [5] — WHEAT. Fastest crop, earns 6G. Best for beginners!",
    toolSlot: 4,
    handTarget: { x: SLOT_X[4], y: TOOLBAR_Y },
    handDir: "down",
    done: (tool) => tool === "wheat-seed",
  },
  {
    id: "plant-seed",
    title: "4. PLANT ON TILLED SOIL",
    desc: "Click a tilled (brown) plot to drop the seed in. Watch it sprout!",
    toolSlot: 4,
    handTarget: { x: 22, y: 50 },
    handDir: "right",
    done: (_, plots) => plots.some(p => p.crop !== null),
  },
  {
    id: "select-water",
    title: "5. WATER YOUR CROP",
    desc: "Click slot [4] — WATERING CAN. Crops CANNOT grow without water!",
    toolSlot: 3,
    handTarget: { x: SLOT_X[3], y: TOOLBAR_Y },
    handDir: "down",
    done: (tool) => tool === "water",
  },
  {
    id: "water-plot",
    title: "6. CLICK THE PLANTED PLOT",
    desc: "Water the plot with your crop. The soil turns dark when watered.",
    toolSlot: 3,
    handTarget: { x: 22, y: 50 },
    handDir: "right",
    done: (_, plots) => plots.some(p => p.watered && p.crop !== null),
  },
  {
    id: "wait-grow",
    title: "7. WAIT FOR IT TO GROW",
    desc: "Watch the % above the plot. When it hits 100% — harvest time! Use HOE to harvest.",
    toolSlot: -1,
    handTarget: { x: 22, y: 50 },
    handDir: "right",
    done: (_, plots) => plots.some(p => p.crop?.ready === true),
  },
];

const HAND_SIZE = 60;

function getHandPos(target: { x: number; y: number }, dir: "down" | "right" | "left" | "up", W: number, H: number) {
  const tx = (target.x / 100) * W;
  const ty = (target.y / 100) * H;
  const gap = 6;
  switch (dir) {
    case "down":  return { left: tx - HAND_SIZE / 2, top: ty - HAND_SIZE - gap, rotate: 180 };
    case "up":    return { left: tx - HAND_SIZE / 2, top: ty + gap,             rotate: 0   };
    case "right": return { left: tx - HAND_SIZE - gap, top: ty - HAND_SIZE / 2, rotate: 90  };
    case "left":  return { left: tx + gap,             top: ty - HAND_SIZE / 2, rotate: -90 };
  }
}

export default function OnboardingHUD({ currentTool, farmPlots, onDismiss }: OnboardingHUDProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [containerSize, setContainerSize] = useState({ w: 1280, h: 720 });
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Measure container
  useEffect(() => {
    const m = () => {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        setContainerSize({ w: r.width, h: r.height });
      }
    };
    m();
    window.addEventListener("resize", m);
    return () => window.removeEventListener("resize", m);
  }, []);

  // Countdown timer — dismiss after 60s idle
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          onDismiss();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [onDismiss]);

  useEffect(() => {
    const step = STEPS[stepIdx];
    if (!step) return;
    if (step.done(currentTool, farmPlots)) {
      if (stepIdx < STEPS.length - 1) setStepIdx((i) => i + 1);
      else onDismiss();
    }
  }, [currentTool, farmPlots, stepIdx, onDismiss]);

  const step = STEPS[stepIdx];
  if (!step) return null;

  const { w: W, h: H } = containerSize;
  const hand = step.handTarget
    ? getHandPos(step.handTarget, step.handDir, W, H)
    : null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1500,
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          maxWidth: 520,
          padding: "12px 16px",
          background: "linear-gradient(180deg,#CE9E64,#8D5A32)",
          border: "3px solid #5C4033",
          borderRadius: 12,
          color: "#FFF8E8",
          fontSize: 8,
          lineHeight: 1.5,
          textShadow: "1px 1px #000",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ color: "#FFD700", marginBottom: 6 }}>{step.title}</div>
        <div style={{ fontSize: 7, opacity: 0.95 }}>{step.desc}</div>
        <div style={{ marginTop: 8, fontSize: 6, color: "#FFE082" }}>
          {timeLeft}s
        </div>
      </div>
      {hand && (
        <img
          src="/tangan.png"
          alt=""
          width={HAND_SIZE}
          height={HAND_SIZE}
          style={{
            position: "absolute",
            left: hand.left,
            top: hand.top,
            transform: `rotate(${hand.rotate}deg)`,
            filter: "drop-shadow(2px 4px 4px rgba(0,0,0,0.5))",
          }}
        />
      )}
    </div>
  );
}