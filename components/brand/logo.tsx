import { cn } from "@/lib/utils";

/**
 * The Greenroom mark — four vertical bars in a crescendo-peak pattern,
 * evoking a live audio level meter frozen at the moment the room peaks.
 * Asymmetric: rises medium → tall → tallest → drops to short.
 */

const BARS = [
  { x: 7.5, y: 14.5, h: 11 },
  { x: 14.5, y: 11, h: 18 },
  { x: 21.5, y: 9, h: 22 },
  { x: 28.5, y: 16.5, h: 7 },
] as const;

export function Logomark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-label="Greenroom"
    >
      <defs>
        <linearGradient id="gr-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#059669" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="8" fill="url(#gr-bg)" />
      {BARS.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={b.y}
          width={4}
          height={b.h}
          rx={2}
          fill="white"
        />
      ))}
    </svg>
  );
}

export function Wordmark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logomark size={size} />
      <span
        className="font-display text-ink-900 tracking-tight"
        style={{
          fontSize: Math.round(size * 0.56),
          fontWeight: 500,
          letterSpacing: "-0.02em",
          fontOpticalSizing: "auto",
        }}
      >
        Greenroom
      </span>
    </div>
  );
}

export function LogoFlat({
  size = 32,
  className,
  color = "currentColor",
}: {
  size?: number;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-label="Greenroom"
    >
      {BARS.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={b.y}
          width={4}
          height={b.h}
          rx={2}
          fill={color}
        />
      ))}
    </svg>
  );
}
