import { useEffect, useState } from "react";

export interface ActionPopupData {
  id: number;
  icon: string;
  title: string;
  subtitle?: string;
  color?: string;
  accent?: string;
  minimal?: boolean;
}

interface Props {
  popup: ActionPopupData | null;
  onDone: () => void;
}

export default function ActionPopup({ popup, onDone }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!popup) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 350);
    }, 2200);
    return () => clearTimeout(t);
  }, [popup?.id]);

  if (!popup) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "42%",
        left: "50%",
        transform: `translate(-50%, -50%) scale(${visible ? 1 : 0.7})`,
        opacity: visible ? 1 : 0,
        transition: "all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)",
        zIndex: 8000,
        pointerEvents: "none",
        textAlign: "center",
        minWidth: 240,
      }}
    >
      {/* Conditionally render wood/gold background or minimal text */}
      <div style={{
        background: popup.minimal ? "transparent" : "linear-gradient(180deg, #CE9E64 0%, #8D5A32 100%)",
        border: popup.minimal ? "none" : "4px solid #5C4033",
        borderRadius: 16,
        padding: popup.minimal ? "8px 0" : "16px 28px",
        boxShadow: popup.minimal ? "none" : "0 0 32px rgba(255,215,0,0.35), 0 8px 0 #3a2212, inset 0 2px 4px rgba(255,255,255,0.25)",
        fontFamily: "'Press Start 2P', monospace",
      }}>
        {/* Icon label — only show if not minimal */}
        {!popup.minimal && (
          <div style={{
            display: "inline-block",
            background: "#5C4033",
            border: "2px solid #3a2212",
            borderRadius: 999,
            padding: "3px 12px",
            fontSize: 7,
            color: "#FFD700",
            textShadow: "1px 1px 0 #000",
            marginBottom: 10,
            letterSpacing: "0.06em",
          }}>
            {popup.icon}
          </div>
        )}
        {/* Title */}
        <div style={{
          fontSize: popup.minimal ? 20 : 12,
          color: "#FFFFFF",
          textShadow: popup.minimal ? "3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000" : "1px 2px 0 #000",
          letterSpacing: "0.04em",
          lineHeight: 1.4,
        }}>
          {popup.title}
        </div>
        {/* Subtitle */}
        {popup.subtitle && (
          <div style={{
            fontSize: popup.minimal ? 9 : 7,
            color: "#FFE4B5",
            marginTop: 8,
            textShadow: "1px 1px 0 #000",
            lineHeight: 1.6,
            opacity: 0.95,
          }}>
            {popup.subtitle}
          </div>
        )}
      </div>
      <style>{`
        @keyframes popupRing {
          from { transform: scale(0.85); opacity: 0.8; }
          to { transform: scale(1.35); opacity: 0; }
        }
      `}</style>
      {/* Gold ring burst */}
      <div style={{
        position: "absolute", inset: -10, borderRadius: 24,
        border: "2px solid rgba(255,215,0,0.5)",
        animation: "popupRing 0.5s ease-out forwards",
        pointerEvents: "none",
      }} />
    </div>
  );
}
