"use client";

import React, { useState, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

// Note: no --radius-card token exists in globals.css; the SVG rx attribute uses
// the literal value 12 (matching --border-radius-xl: 12px) because CSS custom
// properties cannot be reliably used in SVG geometry attributes across browsers.

export interface SpotlightOverlayProps {
  cardIds: string[];
  padding?: number;
}

interface HoleRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function SpotlightOverlay({
  cardIds,
  padding = 0,
}: SpotlightOverlayProps) {
  const [holes, setHoles] = useState<HoleRect[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    const measure = () => {
      const domRects: DOMRect[] = [];

      for (const id of cardIds) {
        const el = document.querySelector(`[data-onboarding-card="${id}"]`);
        if (!el) continue;
        domRects.push(el.getBoundingClientRect());
      }

      if (domRects.length === 0) {
        setHoles([]);
        return;
      }

      // Create one individual hole per matched card
      const nextHoles: HoleRect[] = domRects.map((r) => ({
        x: r.left - padding,
        y: r.top - padding,
        width: r.width + padding * 2,
        height: r.height + padding * 2,
      }));

      setHoles(nextHoles);
    };

    measure();

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [cardIds, padding]);

  if (!mounted) return null;
  return createPortal(
    <svg
      className="spotlight-overlay-svg"
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <defs>
        <mask id="spotlight-mask">
          <rect width="100%" height="100%" fill="white" />
          {holes.map((hole, i) => (
            <rect
              key={i}
              x={hole.x}
              y={hole.y}
              width={hole.width}
              height={hole.height}
              rx="8"
              fill="black"
            />
          ))}
        </mask>
      </defs>

      <rect
        width="100%"
        height="100%"
        fill="var(--onboarding-overlay-bg)"
        mask="url(#spotlight-mask)"
      />
    </svg>,
    document.body,
  );
}
