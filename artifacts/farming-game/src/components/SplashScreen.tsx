import { useEffect, useState } from "react";
import { MapType } from "../game/Game";

interface SplashScreenProps {
  onSelectMap: (map: MapType) => void;
}

export default function SplashScreen({ onSelectMap }: SplashScreenProps) {
  const [ready, setReady] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1800);
    return () => clearTimeout(t);
  }, []);

  const handleStart = () => {
    if (!ready || clicked) return;
    setClicked(true);
    setFadeOut(true);
    setTimeout(() => onSelectMap("home"), 700);
  };

  return (
    <div
      onClick={handleStart}
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        zIndex: 99999,
        cursor: ready ? "pointer" : "default",
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 0.7s ease",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        @keyframes splashPanZoom {
          0% { transform: scale(1.04) translate(0,0); }
          50% { transform: scale(1.1) translate(1%,-1%); }
          100% { transform: scale(1.04) translate(0,0); }
        }
        @keyframes splashLogoFloat {
          0%,100% { transform: translate(-50%,-50%) translateY(0px); }
          50% { transform: translate(-50%,-50%) translateY(-10px); }
        }
        @keyframes splashFadeUp {
          from { opacity:0; transform:translateX(-50%) translateY(14px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
        @keyframes splashBtnFadeUp {
          from { opacity:0; transform:translateX(-50%) translateY(18px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
        @keyframes splashBtnBob {
          0%,100% { transform:translateX(-50%) translateY(0); }
          50%     { transform:translateX(-50%) translateY(-5px); }
        }
      `}</style>

      {/* BACKGROUND */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url(/home_1774349990715.jpg)",
        backgroundSize: "cover", backgroundPosition: "center",
        animation: "splashPanZoom 22s ease-in-out infinite alternate",
        willChange: "transform",
        zIndex: 1,
      }} />

      {/* GRADIENT OVERLAY — darker at bottom */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.82) 100%)",
        zIndex: 2,
      }} />

      {/* LOGO */}
      <img
        src="/logo.png"
        alt="LIFETOPIA"
        style={{
          position: "absolute",
          top: "44%", left: "50%",
          height: 320,
          objectFit: "contain",
          filter: "drop-shadow(0 16px 40px rgba(0,0,0,0.9))",
          zIndex: 10,
          pointerEvents: "none",
          animation: "splashLogoFloat 4s ease-in-out infinite",
        }}
      />

      {/* SUBTITLE */}
      <div style={{
        position: "absolute",
        top: "67%", left: "50%",
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 10,
        color: "#FFE4B5",
        textShadow: "2px 2px 0 #000",
        zIndex: 10,
        whiteSpace: "nowrap",
        letterSpacing: 2,
        animation: "splashFadeUp 0.8s ease forwards",
        opacity: 0,
        animationDelay: "0.6s",
      }}>
        PUBLIC ALPHA — SOLANA DEVNET
      </div>

      {/* CLICK TO START — same .wb style as wallet buttons */}
      {ready && (
        <div style={{
          position: "absolute",
          top: "77%", left: "50%",
          zIndex: 20,
          animation: clicked ? "none" : "splashBtnFadeUp 0.5s ease forwards, splashBtnBob 2s ease-in-out 0.5s infinite",
          opacity: 0,
          animationFillMode: "forwards",
        }}>
          <button
            style={{
              fontFamily: "'Press Start 2P', monospace",
              background: "linear-gradient(180deg, #CE9E64 0%, #8D5A32 100%)",
              border: "3px solid #5C4033",
              borderRadius: "999px",
              color: "#FFF5E0",
              cursor: "pointer",
              boxShadow: "0 6px 0 #3a2212, inset 0 1px 1px rgba(255,255,255,0.45)",
              padding: "14px 40px",
              fontSize: 11,
              textShadow: "1px 1px 1px #000",
              letterSpacing: 1,
              pointerEvents: "none", // parent div handles click
            }}
          >
            ▶ CLICK TO START
          </button>
        </div>
      )}

      {/* BOTTOM INFO */}
      <div style={{
        position: "absolute",
        bottom: 28, left: "50%",
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 6,
        color: "rgba(255,220,150,0.55)",
        zIndex: 10,
        textAlign: "center",
        whiteSpace: "nowrap",
        animation: "splashFadeUp 0.8s ease forwards",
        opacity: 0,
        animationDelay: "1s",
        transform: "translateX(-50%)",
      }}>
        CONNECT WALLET · FARM · EARN GOLD · CLAIM NFT · LIFETOPIA WORLD v0.9.7
      </div>
    </div>
  );
}
