import { useEffect, useState } from "react";
import { MapType } from "../game/Game";

interface SplashScreenProps {
  onSelectMap: (map: MapType) => void;
}

export default function SplashScreen({ onSelectMap }: SplashScreenProps) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setOpacity(1), 80);
    const t2 = setTimeout(() => setOpacity(0), 1900);
    const t3 = setTimeout(() => onSelectMap("home"), 2450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onSelectMap]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        zIndex: 9999,
      }}
    >
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap");
        @keyframes logoFloat {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes scanline {
          0% { transform: translateY(-120%); opacity: 0; }
          20% { opacity: 0.35; }
          100% { transform: translateY(220%); opacity: 0; }
        }
      `}</style>

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url(/map_base.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.52) saturate(1.05)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity,
          transition: "opacity 0.55s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 18,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at center, rgba(80,180,40,0.18) 0%, rgba(0,0,0,0.72) 72%)",
          }}
        />

        <img
          src="/logo.png"
          alt="LIFETOPIA"
          style={{
            height: 188,
            objectFit: "contain",
            position: "relative",
            zIndex: 2,
            animation: "logoFloat 2.8s ease-in-out infinite",
            filter:
              "drop-shadow(0 0 24px rgba(110,255,50,0.45)) drop-shadow(0 5px 20px rgba(0,0,0,0.9))",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 8,
            letterSpacing: 1.6,
            color: "rgba(255,255,255,0.9)",
            textShadow: "0 2px 8px rgba(0,0,0,1)",
          }}
        >
          PREPARING FARM WORLD...
        </div>

        <div
          style={{
            width: 280,
            height: 14,
            border: "2px solid #5C4033",
            borderRadius: 999,
            background: "rgba(20,10,5,0.85)",
            overflow: "hidden",
            position: "relative",
            zIndex: 2,
            boxShadow: "inset 0 0 8px rgba(0,0,0,0.6)",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(90deg, #6BAA36 0%, #B8E85C 55%, #8BC34A 100%)",
              boxShadow: "0 0 14px rgba(160,255,90,0.55)",
              transformOrigin: "left center",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: -8,
              bottom: -8,
              background:
                "linear-gradient(120deg, transparent 15%, rgba(255,255,255,0.35) 50%, transparent 85%)",
              animation: "scanline 1.3s linear infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}
