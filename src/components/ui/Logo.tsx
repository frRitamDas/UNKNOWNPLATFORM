import { cn } from "@/lib/utils";

export function LogoMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="11" fill="#C9F950" />
      <path d="M15.5 12.4c0-1 1.1-1.6 1.9-1.1l9.4 6.1c.8.5.8 1.7 0 2.2l-9.4 6.1c-.8.5-1.9-.1-1.9-1.1V12.4Z" fill="#06070A" />
      <rect x="9" y="27.5" width="12" height="3.4" rx="1.7" fill="#06070A" opacity="0.9" />
      <rect x="23" y="27.5" width="8" height="3.4" rx="1.7" fill="#06070A" opacity="0.45" />
    </svg>
  );
}

export function Logo({ className, size = 30 }: { className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className="text-[1.0625rem] font-extrabold tracking-[-0.03em] text-ink-50">
        Reel<span className="text-lime-signal">forge</span>
      </span>
    </span>
  );
}
