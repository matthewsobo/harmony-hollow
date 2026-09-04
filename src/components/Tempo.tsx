/*
 * Tempo the fox — the game's mascot, drawn as plain SVG shapes so no
 * illustration software is ever needed. Phase 7 adds celebrate/encourage
 * poses; for now there's one friendly idle pose.
 */
export function Tempo({ size = 120 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="Tempo the fox"
    >
      {/* ears */}
      <polygon points="30,38 42,10 54,36" fill="#d97f2e" />
      <polygon points="90,38 78,10 66,36" fill="#d97f2e" />
      <polygon points="35,34 42,18 49,33" fill="#fff" />
      <polygon points="85,34 78,18 71,33" fill="#fff" />
      {/* head */}
      <circle cx="60" cy="62" r="34" fill="#f4a259" />
      {/* white muzzle */}
      <ellipse cx="60" cy="76" rx="20" ry="15" fill="#fff" />
      {/* eyes */}
      <circle cx="48" cy="56" r="4.5" fill="#3d3324" />
      <circle cx="72" cy="56" r="4.5" fill="#3d3324" />
      <circle cx="49.5" cy="54.5" r="1.5" fill="#fff" />
      <circle cx="73.5" cy="54.5" r="1.5" fill="#fff" />
      {/* nose + smile */}
      <ellipse cx="60" cy="70" rx="5" ry="4" fill="#3d3324" />
      <path d="M52 80 Q60 88 68 80" stroke="#3d3324" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
