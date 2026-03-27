import { useEffect } from "react";
import { MapType } from "../game/Game";

interface SplashScreenProps {
  onSelectMap: (map: MapType) => void;
}

export default function SplashScreen({ onSelectMap }: SplashScreenProps) {
  useEffect(() => {
    // Forced duration of at least 5 seconds
    const t = setTimeout(() => onSelectMap("home"), 5000);
    return () => clearTimeout(t);
  }, [onSelectMap]);

  return (
    <div
      onClick={() => onSelectMap("home")}
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        zIndex: 99999,
        opacity: 1, 
        cursor: "pointer"
      }}
    >
      <style>{`
        @keyframes introPanZoom {
          0% { transform: scale(1.05) translate(0%, 0%); }
          50% { transform: scale(1.15) translate(2%, -2%); }
          100% { transform: scale(1.05) translate(0%, 0%); }
        }
        @keyframes introLogoFloat {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -55%) scale(1.03); }
        }
      `}</style>

      {/* BACKGROUND - INTRO.PNG ONLY */}
      <div 
        style={{ 
          position: 'absolute', 
          inset: 0,
          background: 'url(/intro.png) center center / cover no-repeat',
          animation: 'introPanZoom 25s ease-in-out infinite alternate',
          willChange: 'transform',
          zIndex: 1
        }} 
        onError={(e) => {
          (e.target as any).style.backgroundImage = "url(/home_1774349990715.jpg)";
        }}
      />

      {/* LOGO - FLOATING CENTER */}
      <img
        src="/logo.png"
        alt="LIFETOPIA"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          height: 380,
          objectFit: "contain",
          filter: "drop-shadow(0 20px 50px rgba(0,0,0,0.9))",
          zIndex: 10,
          pointerEvents: "none",
          animation: 'introLogoFloat 4s ease-in-out infinite'
        }}
      />
    </div>
  );
}
