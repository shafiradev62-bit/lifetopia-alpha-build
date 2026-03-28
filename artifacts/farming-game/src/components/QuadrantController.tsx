import { useRef, useCallback } from "react";
import { getTouchQuadrant, quadrantToKeys, type QuadrantDir } from "../game/MobileController";

interface Props {
  onDirChange: (keys: string[], active: boolean) => void;
  disabled?: boolean;
}

/**
 * Transparent 4-quadrant touch overlay for mobile movement.
 * Covers the canvas area (excluding HUD zones).
 * TouchStart → begin moving, TouchEnd/Cancel → stop.
 */
export default function QuadrantController({ onDirChange, disabled }: Props) {
  const activeDirRef = useRef<QuadrantDir>(null);
  const touchIdRef = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    // Only handle first touch for movement
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    touchIdRef.current = touch.identifier;

    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const dir = getTouchQuadrant(
      touch.clientX - rect.left,
      touch.clientY - rect.top,
      rect.width,
      rect.height,
    );
    if (dir) {
      activeDirRef.current = dir;
      onDirChange(quadrantToKeys(dir), true);
    }
    e.preventDefault();
  }, [disabled, onDirChange]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    // Find our tracked touch
    let touch: React.Touch | null = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touch = e.changedTouches[i];
        break;
      }
    }
    if (!touch) return;

    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const newDir = getTouchQuadrant(
      touch.clientX - rect.left,
      touch.clientY - rect.top,
      rect.width,
      rect.height,
    );

    if (newDir !== activeDirRef.current) {
      // Release old direction
      if (activeDirRef.current) {
        onDirChange(quadrantToKeys(activeDirRef.current), false);
      }
      // Apply new direction
      if (newDir) {
        activeDirRef.current = newDir;
        onDirChange(quadrantToKeys(newDir), true);
      } else {
        activeDirRef.current = null;
      }
    }
    e.preventDefault();
  }, [disabled, onDirChange]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    let found = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        found = true;
        break;
      }
    }
    if (!found) return;

    if (activeDirRef.current) {
      onDirChange(quadrantToKeys(activeDirRef.current), false);
      activeDirRef.current = null;
    }
    touchIdRef.current = null;
    e.preventDefault();
  }, [onDirChange]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        position: "absolute",
        // Leave top 60px for HUD, bottom 120px for map selector
        top: 60,
        left: 0,
        right: 0,
        bottom: 120,
        zIndex: 900,
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        // Completely transparent — no visual
        background: "transparent",
        pointerEvents: "auto",
      }}
    />
  );
}
