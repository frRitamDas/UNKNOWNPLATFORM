import { cn } from "@/lib/utils";

/**
 * Reelforge mark: a soft stack of gradient puffs (speech + cloud + waveform).
 * Deliberately its own shape — not a redraw of a competitor's logo.
 */
export function LogoMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rf-puff" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3EC6F5" />
          <stop offset="0.42" stopColor="#9DC6FF" />
          <stop offset="0.72" stopColor="#FFC38C" />
          <stop offset="1" stopColor="#FF8A3D" />
        </linearGradient>
        <filter id="rf-soft" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="0.9" />
        </filter>
      </defs>
      <g fill="url(#rf-puff)" filter="url(#rf-soft)">
        <ellipse cx="24" cy="14.5" rx="11.5" ry="8.5" />
        <ellipse cx="13.5" cy="25" rx="12" ry="8" opacity="0.92" />
        <ellipse cx="34.5" cy="25" rx="12" ry="8" opacity="0.92" />
        <ellipse cx="24" cy="34.5" rx="15" ry="8.5" opacity="0.96" />
      </g>
    </svg>
  );
}

export function Logo({
  className,
  size = 30,
  tone = "light",
  showWord = true,
}: {
  className?: string;
  size?: number;
  tone?: "light" | "dark";
  showWord?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWord && (
        <span
          className={cn(
            "text-[1.15rem] font-bold tracking-[-0.045em]",
            tone === "light" ? "text-white" : "text-cream-900",
          )}
        >
          reelforge
        </span>
      )}
    </span>
  );
}
