"use client";

import { forwardRef } from "react";

/**
 * The Interseptor frog, rebuilt as live SVG so it can look at a target,
 * open its mouth and blink. Geometry follows the mascot sources in the
 * Interseptor repo (website/assets/img/mascot/src), drawn around (0, 0).
 *
 * The forwarded ref points at an invisible anchor inside the mouth; the
 * pond scene measures it to know where the tongue starts.
 */

const INK = "#12302a";
const BODY =
  "M -255 58 C -255 -104 -150 -172 0 -172 C 150 -172 255 -104 255 58 C 255 178 168 228 0 228 C -168 228 -255 178 -255 58 Z";
const ARM_L = "M -212 56 C -238 78 -252 100 -258 128";
const ARM_R = "M 212 56 C 238 78 252 100 258 128";

type FrogProps = {
  /** Direction to look, each axis in -1..1. */
  look: { x: number; y: number };
  mouthOpen: boolean;
  /** Squash for a beat after swallowing. */
  gulp: boolean;
  blink: boolean;
  className?: string;
};

/** Silhouette used for the sticker border and its shadow. */
function Silhouette({ fill, width }: { fill: string; width: number }) {
  return (
    <g fill={fill} stroke={fill} strokeWidth={width}>
      <path d={BODY} />
      <circle cx="-128" cy="-150" r="90" />
      <circle cx="128" cy="-150" r="90" />
      <ellipse cx="-118" cy="224" rx="70" ry="30" />
      <ellipse cx="118" cy="224" rx="70" ry="30" />
      <path d={ARM_L} fill="none" strokeWidth={width + 40} />
      <path d={ARM_R} fill="none" strokeWidth={width + 40} />
    </g>
  );
}

function Eye({ cx, look, blink }: { cx: number; look: { x: number; y: number }; blink: boolean }) {
  const px = look.x * 16;
  const py = look.y * 14;
  return (
    <g>
      <clipPath id={`eye-${cx}`}>
        <circle cx={cx} cy="-144" r="58" />
      </clipPath>
      <circle cx={cx} cy="-144" r="58" fill="#fff" stroke={INK} strokeWidth="14" />
      <g
        style={{ transform: `translate(${px}px, ${py}px)`, transition: "transform 0.25s ease-out" }}
      >
        <circle cx={cx + 6} cy="-146" r="37" fill={INK} />
        <circle cx={cx - 4} cy="-159" r="11.5" fill="#fff" />
        <circle cx={cx + 18} cy="-135" r="5.5" fill="#fff" />
      </g>
      {blink && (
        <g clipPath={`url(#eye-${cx})`}>
          <rect
            className="animate-frog-blink"
            x={cx - 64}
            y="-206"
            width="128"
            height="124"
            fill="#4cd4a9"
          />
        </g>
      )}
    </g>
  );
}

export const Frog = forwardRef<SVGCircleElement, FrogProps>(function Frog(
  { look, mouthOpen, gulp, blink, className },
  mouthRef
) {
  return (
    <svg
      viewBox="-320 -290 640 580"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <g
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{
          transform: gulp ? "scale(1.06, 0.94)" : "scale(1)",
          transformOrigin: "0px 250px",
          transition: "transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <g transform="translate(12 12)">
          <Silhouette fill="#061713" width={104} />
        </g>
        <Silhouette fill="#fff" width={76} />

        <path d={BODY} fill="#4cd4a9" stroke={INK} strokeWidth="28" />
        <circle cx="-128" cy="-150" r="90" fill="#4cd4a9" stroke={INK} strokeWidth="28" />
        <circle cx="128" cy="-150" r="90" fill="#4cd4a9" stroke={INK} strokeWidth="28" />
        <path d={BODY} fill="#4cd4a9" />
        <circle cx="-128" cy="-150" r="90" fill="#4cd4a9" />
        <circle cx="128" cy="-150" r="90" fill="#4cd4a9" />

        <ellipse cx="0" cy="114" rx="132" ry="88" fill="#fff8eb" stroke={INK} strokeWidth="14" />
        <ellipse cx="-118" cy="224" rx="70" ry="30" fill="#4cd4a9" stroke={INK} strokeWidth="14" />
        <ellipse cx="118" cy="224" rx="70" ry="30" fill="#4cd4a9" stroke={INK} strokeWidth="14" />
        <ellipse cx="-172" cy="-64" rx="31" ry="19" fill="#ff6fa5" />
        <ellipse cx="172" cy="-64" rx="31" ry="19" fill="#ff6fa5" />

        <Eye cx={-128} look={look} blink={blink} />
        <Eye cx={128} look={look} blink={blink} />

        {mouthOpen ? (
          <ellipse cx="0" cy="-48" rx="40" ry="32" fill={INK} />
        ) : (
          <path d="M -44 -62 Q 0 -26 44 -62" fill="none" stroke={INK} strokeWidth="14" />
        )}
        <circle ref={mouthRef} cx="0" cy="-48" r="1" fill="none" />

        <path d={ARM_L} fill="none" stroke={INK} strokeWidth="68" />
        <path d={ARM_L} fill="none" stroke="#4cd4a9" strokeWidth="40" />
        <path d={ARM_R} fill="none" stroke={INK} strokeWidth="68" />
        <path d={ARM_R} fill="none" stroke="#4cd4a9" strokeWidth="40" />
      </g>
    </svg>
  );
});
