import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A pure-CSS tooltip. Wraps any inline element and reveals `label` on hover.
 * Position: above the wrapped element, centered, with a small caret.
 *
 * Uses `group-hover` — no JS, no Radix dependency.
 */
export function Tooltip({
  label,
  children,
  className,
  side = "top",
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  side?: "top" | "bottom";
}) {
  const isTop = side === "top";
  return (
    <span className={cn("relative group inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 -translate-x-1/2 z-50",
          "w-max max-w-[260px] whitespace-normal",
          "rounded-md bg-ink-900 px-2.5 py-1.5",
          "text-[11.5px] font-normal leading-relaxed text-white",
          "opacity-0 group-hover:opacity-100",
          "translate-y-1 group-hover:translate-y-0",
          "transition-all duration-150 ease-out",
          "shadow-lg ring-1 ring-black/5",
          isTop ? "bottom-full mb-2" : "top-full mt-2",
        )}
      >
        {label}
        <span
          aria-hidden
          className={cn(
            "absolute left-1/2 -translate-x-1/2 w-0 h-0",
            "border-[5px] border-transparent",
            isTop
              ? "top-full border-t-ink-900"
              : "bottom-full border-b-ink-900",
          )}
        />
      </span>
    </span>
  );
}
