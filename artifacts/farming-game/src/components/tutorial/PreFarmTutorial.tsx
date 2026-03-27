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
    durationMs: 8400,
    color: "#8BC34A",
    bubble:
      "Welcome to your FARM. Till soil, plant seeds, water, fertilize, then harvest for gold and progress.",
    details: [
      "• Use tools to prepare plots and plant crops.",
      "• Crop growth needs water and can be boosted by fertilizer.",
      "• Harvest gives GOLD + inventory crops + quest progression.",
      "• Dynamic plot states are tracked in real-time.",
    ],
  },
  {
    id: "city",
    title: "CITY SHOP SYSTEM",
    map: "city",
    durationMs: 7000,
    color: "#FFD54F",
    bubble:
      "This is the CITY. Buy seeds, tools, and supplies to scale your farming economy.",
    details: [
      "• Spend GOLD to buy seed stock and consumables.",
      "• Refill your inventory before returning to farm.",
      "• Better economy flow = faster progression.",
    ],
  },
  {
    id: "garden",
    title: "GARDEN SOCIAL HUB",
    map: "garden",
    durationMs: 6800,
    color: "#80DEEA",
    bubble:
      "In GARDEN, you can meet other players, chill, and share progression moments.",
    details: [
      "• Social roleplay and community interactions.",
      "• Designed as a friendly multiplayer meeting point.",
      "• Great place for events and seasonal activities.",
    ],
  },
  {
    id: "fishing",
    title: "FISHING SIDE ACTIVITY",
    map: "fishing",
    durationMs: 6800,
    color: "#64B5F6",
    bubble:
      "FISHING is your side income route. Cast, wait for bite timing, then reel for rewards.",
    details: [
      "• Alternative gold flow outside farming cycle.",
      "• Timing-focused mini gameplay for bonus profit.",
      "• Useful when crops are still growing.",
    ],
  },
  {
    id: "suburban",
    title: "SUBURBAN NEXT STEP",
    map: "suburban",
    durationMs: 6500,
    color: "#CE93D8",
    bubble:
      "SUBURBAN is reserved for the next expansion phase: progression, content, and future systems.",
    details: [
      "• Planned area for upcoming gameplay stages.",
      "• Future unlocks, events, and advanced progression.",
      "• You are seeing the roadmap in-world.",
    ],
  },
];

const MAP_BG: Record<MapType, string> = {
  home: "/home_1774349990715.jpg",
  city: "/map_city_new.png",
  fishing: "/map_fishing_new.png",
  garden: "/map_garden_new.png",
  suburban: "/map_suburban_1774358176142.png",
};

const MAP_ICON: Record<MapType, string> = {
  home: "🌾",
  city: "🏙️",
  garden: "🌳",
  fishing: "🎣",
  suburban: "🏡",
};

export default function PreFarmTutorial({
  visible,
  onFinished,
  onMapFocus,
}: PreFarmTutorialProps) {
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepElapsed, setStepElapsed] = useState(0);
  const [bubblePulse, setBubblePulse] = useState(0);
  const [typedBubble, setTypedBubble] = useState("");
  const [shutterPhase, setShutterPhase] = useState<
    "idle" | "closing" | "opening"
  >("idle");
  const [skipHoldProgress, setSkipHoldProgress] = useState(0);
  const [skipHolding, setSkipHolding] = useState(false);
  const [skipConfirmed, setSkipConfirmed] = useState(false);
  const [skipSource, setSkipSource] = useState<"button" | "keyboard" | null>(
    null,
  );
  const holdDurationMs = 1200;
  const holdStartRef = useRef<number | null>(null);
  const holdRafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientRef = useRef<{
    ctx: AudioContext;
    gain: GainNode;
    hp: BiquadFilterNode;
    lp: BiquadFilterNode;
    o1: OscillatorNode;
    o2: OscillatorNode;
    lfo: OscillatorNode;
    lfoGain: GainNode;
  } | null>(null);

  const step = STEPS[Math.min(stepIndex, STEPS.length - 1)];
  const totalDuration = useMemo(
    () => STEPS.reduce((a, b) => a + b.durationMs, 0),
    [],
  );
  const elapsedTotal = useMemo(() => {
    const prev = STEPS.slice(0, stepIndex).reduce(
      (a, b) => a + b.durationMs,
      0,
    );
    return Math.min(totalDuration, prev + stepElapsed);
  }, [stepIndex, stepElapsed, totalDuration]);

  useEffect(() => {
    if (!visible) return;
    setStarted(false);
    setStepIndex(0);
    setStepElapsed(0);
    setSkipHoldProgress(0);
    setSkipHolding(false);
    setSkipConfirmed(false);
    setSkipSource(null);
    setTypedBubble("");
    setShutterPhase("opening");
    holdStartRef.current = null;
    if (holdRafRef.current) {
      cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }
    const t = setTimeout(() => setStarted(true), 320);
    return () => clearTimeout(t);
  }, [visible]);

  useEffect(() => {
    if (!visible || !started) return;
    onMapFocus?.(step.map);
  }, [visible, started, step.map, onMapFocus]);

  useEffect(() => {
    if (!visible || !started) return;
    setTypedBubble("");
    let i = 0;
    const text = step.bubble;
    const t = setInterval(() => {
      i += 1;
      setTypedBubble(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, 22);
    return () => clearInterval(t);
  }, [visible, started, stepIndex, step.bubble]);

  useEffect(() => {
    if (!visible || !started) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setStepElapsed((v) => v + dt);
      setBubblePulse((p) => p + dt * 0.0032);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, started]);

  useEffect(() => {
    if (!visible || !started) return;
    if (stepElapsed < step.durationMs) return;

    if (stepIndex < STEPS.length - 1) {
      if (shutterPhase !== "idle") return;
      setShutterPhase("closing");
      const t = setTimeout(() => {
        setStepIndex((i) => i + 1);
        setStepElapsed(0);
        setShutterPhase("opening");
      }, 320);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      if (visible) onFinished();
    }, 560);
    return () => clearTimeout(t);
  }, [
    visible,
    started,
    stepElapsed,
    step.durationMs,
    stepIndex,
    onFinished,
    shutterPhase,
  ]);

  const startAmbientBed = () => {
    try {
      if (ambientRef.current) return;
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = audioCtxRef.current || new Ctx();
      audioCtxRef.current = ctx;

      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const hp = ctx.createBiquadFilter();
      const lp = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      o1.type = "sine";
      o2.type = "triangle";
      o1.frequency.setValueAtTime(82, ctx.currentTime);
      o2.frequency.setValueAtTime(123, ctx.currentTime);

      hp.type = "highpass";
      hp.frequency.setValueAtTime(55, ctx.currentTime);

      lp.type = "lowpass";
      lp.frequency.setValueAtTime(820, ctx.currentTime);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.014, ctx.currentTime + 1.05);

      lfo.type = "sine";
      lfo.frequency.setValueAtTime(0.06, ctx.currentTime);
      lfoGain.gain.setValueAtTime(0.0065, ctx.currentTime);

      o1.connect(hp);
      o2.connect(hp);
      hp.connect(lp);
      lp.connect(gain);
      gain.connect(ctx.destination);

      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      o1.start();
      o2.start();
      lfo.start();

      ambientRef.current = { ctx, gain, hp, lp, o1, o2, lfo, lfoGain };
    } catch {
      // ignore ambient errors silently
    }
  };

  const stopAmbientBed = () => {
    try {
      const a = ambientRef.current;
      if (!a) return;
      const t = a.ctx.currentTime;
      a.gain.gain.cancelScheduledValues(t);
      a.gain.gain.setValueAtTime(Math.max(0.0001, a.gain.gain.value), t);
      a.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      a.o1.stop(t + 0.38);
      a.o2.stop(t + 0.38);
      a.lfo.stop(t + 0.38);
      setTimeout(() => {
        ambientRef.current = null;
      }, 420);
    } catch {
      // ignore ambient errors silently
    }
  };

  const playStepWhoosh = () => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = audioCtxRef.current || new Ctx();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.2);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2200, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.03, ctx.currentTime + 0.028);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.26);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.24);
    } catch {
      // ignore audio errors silently
    }
  };

  const playSkipConfirmSound = () => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = audioCtxRef.current || new Ctx();
      audioCtxRef.current = ctx;

      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const gain = ctx.createGain();

      o1.type = "triangle";
      o2.type = "sine";
      o1.frequency.setValueAtTime(620, ctx.currentTime);
      o1.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.09);
      o2.frequency.setValueAtTime(310, ctx.currentTime);
      o2.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.09);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.055, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.19);

      o1.connect(gain);
      o2.connect(gain);
      gain.connect(ctx.destination);

      o1.start();
      o2.start();
      o1.stop(ctx.currentTime + 0.2);
      o2.stop(ctx.currentTime + 0.2);
    } catch {
      // ignore audio errors silently
    }
  };

  const commitSkip = (source: "button" | "keyboard") => {
    if (!visible || skipConfirmed) return;
    setSkipConfirmed(true);
    setSkipHolding(false);
    setSkipHoldProgress(1);
    setSkipSource(source);
    playSkipConfirmSound();
    setTimeout(() => {
      if (visible) onFinished();
    }, 220);
  };

  useEffect(() => {
    if (!visible || !started) return;
    if (shutterPhase === "closing") {
      playStepWhoosh();
      return;
    }
    if (shutterPhase === "opening") {
      const t = setTimeout(() => setShutterPhase("idle"), 340);
      return () => clearTimeout(t);
    }
    return;
  }, [shutterPhase, visible, started]);

  const cancelSkipHold = () => {
    setSkipHolding(false);
    holdStartRef.current = null;
    if (holdRafRef.current) {
      cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }
  };

  const startSkipHold = (source: "button" | "keyboard") => {
    if (!visible || skipConfirmed) return;
    if (skipHolding) return;

    setSkipSource(source);
    setSkipHolding(true);
    holdStartRef.current = performance.now();

    const tick = (now: number) => {
      if (!holdStartRef.current) return;
      const elapsed = now - holdStartRef.current;
      const p = Math.max(0, Math.min(1, elapsed / holdDurationMs));
      setSkipHoldProgress(p);
      if (p >= 1) {
        commitSkip(source);
        cancelSkipHold();
        return;
      }
      holdRafRef.current = requestAnimationFrame(tick);
    };

    holdRafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (!visible) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (skipConfirmed) return;
      const key = e.key.toLowerCase();
      if (key === "enter" || key === "k") {
        e.preventDefault();
        if (!skipHolding) {
          startSkipHold("keyboard");
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "enter" || key === "k") {
        e.preventDefault();
        if (!skipConfirmed) {
          setSkipHoldProgress(0);
          cancelSkipHold();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [visible, skipHolding, skipConfirmed]);

  useEffect(() => {
    if (!visible || !started) return;
    startAmbientBed();
    return () => {
      stopAmbientBed();
    };
  }, [visible, started]);

  useEffect(() => {
    return () => {
      if (holdRafRef.current) {
        cancelAnimationFrame(holdRafRef.current);
      }
      stopAmbientBed();
    };
  }, []);

  if (!visible) return null;

  const stepProgress = Math.max(0, Math.min(1, stepElapsed / step.durationMs));
  const totalProgress = Math.max(0, Math.min(1, elapsedTotal / totalDuration));
  const pulse = 0.88 + Math.sin(bubblePulse) * 0.12;

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

        @keyframes pft-fadein {
          from { opacity: 0; transform: scale(1.02); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes pft-scan {
          0% { transform: translateY(-120%); opacity: 0; }
          20% { opacity: 0.4; }
          100% { transform: translateY(220%); opacity: 0; }
        }

        @keyframes pft-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }

        @keyframes pft-caret-blink {
          0%, 45% { opacity: 1; }
          46%, 100% { opacity: 0; }
        }

        .pft-btn {
          font-family: 'Press Start 2P', 'Courier New', monospace;
          background: linear-gradient(180deg, #CE9E64 0%, #8D5A32 100%);
          border: 3px solid #5C4033;
          border-radius: 999px;
          color: #FFF5E0;
          cursor: pointer;
          box-shadow: 0 4px 0 #3a2212, inset 0 1px 1px rgba(255,255,255,0.45);
          transition: all 0.08s ease;
          padding: 10px 16px;
          font-size: 8px;
          text-shadow: 1px 1px 1px #000;
          letter-spacing: 0.4px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .pft-btn:hover {
          background: linear-gradient(180deg, #D9B380 0%, #AD7D54 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 0 #3a2212;
        }
        .pft-btn:active {
          transform: translateY(2px);
          box-shadow: 0 2px 0 #3a2212;
        }
        .pft-btn[aria-busy="true"] {
          background: linear-gradient(180deg, #D9B380 0%, #AD7D54 100%);
        }
      `}</style>

      <div
        style={{
          position: "absolute",
          inset: -22,
          backgroundImage: `url(${MAP_BG[step.map]})`,
          backgroundSize: "cover",
          backgroundPosition: `${50 + Math.sin(bubblePulse * 0.45) * 1.1}% ${50 + Math.cos(bubblePulse * 0.35) * 0.9}%`,
          transform: `scale(1.04) translate(${Math.sin(bubblePulse * 0.22) * 4}px, ${Math.cos(bubblePulse * 0.19) * 3}px)`,
          filter:
            "brightness(0.34) saturate(0.88) contrast(1.08) hue-rotate(-2deg)",
          animation: "pft-fadein 520ms ease",
          transition:
            "transform 220ms linear, background-position 220ms linear",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 45%, rgba(255,245,210,0.12) 0%, rgba(0,0,0,0.8) 72%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(12,8,6,0.56) 0%, rgba(0,0,0,0.8) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 4,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height:
              shutterPhase === "closing"
                ? "50%"
                : shutterPhase === "opening"
                  ? "0%"
                  : "0%",
            background: "linear-gradient(180deg, #2f1b0f 0%, #120a06 100%)",
            borderBottom: "3px solid #5C4033",
            transition: "height 240ms ease",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height:
              shutterPhase === "closing"
                ? "50%"
                : shutterPhase === "opening"
                  ? "0%"
                  : "0%",
            background: "linear-gradient(0deg, #2f1b0f 0%, #120a06 100%)",
            borderTop: "3px solid #5C4033",
            transition: "height 240ms ease",
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          right: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "#FFF4CF",
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 8,
          textShadow: "0 2px 6px rgba(0,0,0,1)",
          letterSpacing: 1,
        }}
      >
        <div
          style={{
            padding: "10px 14px",
            border: "3px solid #5C4033",
            borderRadius: 12,
            background: "linear-gradient(180deg, #CE9E64 0%, #8D5A32 100%)",
            boxShadow: "0 4px 0 #3a2212, inset 0 1px 2px rgba(255,255,255,0.3)",
          }}
        >
          PRE-FARM BRIEFING
        </div>

        <div
          style={{
            padding: "10px 14px",
            border: "3px solid #5C4033",
            borderRadius: 12,
            background: "linear-gradient(180deg, #CE9E64 0%, #8D5A32 100%)",
            color: "#FFE082",
          }}
        >
          STEP {stepIndex + 1}/{STEPS.length}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 28,
          transform: "translateX(-50%)",
          width: 1100,
          maxWidth: "calc(100% - 36px)",
          border: "4px solid #5C4033",
          borderRadius: 18,
          background: "linear-gradient(180deg, #B98755 0%, #7D4D2B 100%)",
          boxShadow:
            "0 10px 0 rgba(40,20,10,0.8), inset 0 2px 8px rgba(255,255,255,0.25), 0 20px 50px rgba(0,0,0,0.8)",
          padding: 16,
          color: "#FFF4CF",
          fontFamily: "'Press Start 2P', monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              border: "3px solid #5C4033",
              background: "linear-gradient(180deg, #D4AF37 0%, #8D5A32 100%)",
              boxShadow:
                "0 4px 0 #3a2212, inset 0 1px 2px rgba(255,255,255,0.35)",
              display: "grid",
              placeItems: "center",
              fontSize: 18,
              lineHeight: 1,
              animation: "pft-float 2.2s ease-in-out infinite",
            }}
          >
            {MAP_ICON[step.map]}
          </div>
          <div
            style={{
              fontSize: 12,
              color: step.color,
              textShadow: "0 2px 7px rgba(0,0,0,0.8)",
              animation: "pft-float 2.2s ease-in-out infinite",
            }}
          >
            {step.title}
          </div>
        </div>

        <div
          style={{
            position: "relative",
            border: "3px solid #5C4033",
            borderRadius: 14,
            background: "rgba(43, 26, 13, 0.82)",
            padding: "14px 14px 16px",
            marginBottom: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -40,
              left: 0,
              right: 0,
              bottom: -40,
              background:
                "linear-gradient(120deg, transparent 20%, rgba(255,255,255,0.26) 50%, transparent 80%)",
              animation: "pft-scan 2.4s linear infinite",
            }}
          />
          <div
            style={{
              position: "relative",
              fontSize: 8,
              lineHeight: "1.9",
              transform: `scale(${pulse})`,
              transformOrigin: "left center",
              transition: "transform 120ms linear",
              color: "#FFF8E8",
              textShadow: "0 1px 3px rgba(0,0,0,0.9)",
              minHeight: 38,
            }}
          >
            {typedBubble}
            <span
              style={{
                display:
                  typedBubble.length < step.bubble.length
                    ? "inline-block"
                    : "none",
                marginLeft: 4,
                width: 6,
                animation: "pft-caret-blink 1s steps(1,end) infinite",
              }}
            >
              |
            </span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 12,
          }}
        >
          {step.details.map((line, i) => (
            <div
              key={line + i}
              style={{
                border: "2px solid #5C4033",
                borderRadius: 10,
                background: "rgba(60,35,20,0.65)",
                padding: "10px 10px",
                fontSize: 7,
                lineHeight: "1.7",
                color: "#F9EED2",
              }}
            >
              {line}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: 7,
              color: "#F9EED2",
              lineHeight: "1.7",
            }}
          >
            Auto-running world briefing. Hold to skip while preserving state.
            Use and hold ENTER or K, or hold the button.
          </div>
          <button
            type="button"
            className="pft-btn"
            aria-busy={skipHolding ? "true" : "false"}
            onMouseDown={() => startSkipHold("button")}
            onMouseUp={() => {
              if (!skipConfirmed) {
                setSkipHoldProgress(0);
                cancelSkipHold();
              }
            }}
            onMouseLeave={() => {
              if (!skipConfirmed) {
                setSkipHoldProgress(0);
                cancelSkipHold();
              }
            }}
            onTouchStart={() => startSkipHold("button")}
            onTouchEnd={() => {
              if (!skipConfirmed) {
                setSkipHoldProgress(0);
                cancelSkipHold();
              }
            }}
          >
            <svg width="20" height="20" viewBox="0 0 42 42" aria-hidden="true">
              <circle
                cx="21"
                cy="21"
                r="16"
                fill="none"
                stroke="rgba(0,0,0,0.45)"
                strokeWidth="6"
              />
              <circle
                cx="21"
                cy="21"
                r="16"
                fill="none"
                stroke={skipConfirmed ? "#B8E85C" : "#FFE082"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${Math.max(0.001, skipHoldProgress * 100)} 100`}
                transform="rotate(-90 21 21)"
              />
            </svg>
            {skipConfirmed
              ? "SKIP CONFIRMED"
              : skipHolding
                ? `HOLDING ${Math.floor(skipHoldProgress * 100)}%`
                : "HOLD TO SKIP"}
          </button>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div
            style={{
              height: 14,
              borderRadius: 999,
              border: "2px solid #5C4033",
              overflow: "hidden",
              background: "rgba(20,10,5,0.72)",
            }}
          >
            <div
              style={{
                width: `${Math.floor(totalProgress * 100)}%`,
                height: "100%",
                background:
                  "linear-gradient(90deg, #7AC943 0%, #D9F871 55%, #8BC34A 100%)",
                boxShadow: "0 0 14px rgba(173,255,95,0.58)",
                transition: "width 140ms linear",
              }}
            />
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              border: "2px solid #5C4033",
              overflow: "hidden",
              background: "rgba(20,10,5,0.58)",
            }}
          >
            <div
              style={{
                width: `${Math.floor(stepProgress * 100)}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${step.color} 0%, #FFFFFF 100%)`,
                transition: "width 140ms linear",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
