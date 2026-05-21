import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5",
    "rounded-lg text-[13px] font-medium",
    "transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:translate-y-px",
  ].join(" "),
  {
    variants: {
      variant: {
        brand:
          "bg-brand-700 text-white hover:bg-brand-800 shadow-sm shadow-brand-700/15 ring-1 ring-inset ring-brand-800/20",
        default:
          "bg-ink-900 text-white hover:bg-ink-800 shadow-sm shadow-ink-900/15",
        secondary:
          "bg-white text-ink-900 hover:bg-ink-50 ring-1 ring-inset ring-ink-200/80 shadow-sm",
        outline:
          "border border-ink-300/80 bg-white/80 text-ink-800 hover:bg-white hover:border-ink-400",
        ghost:
          "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
        danger:
          "bg-rose-700 text-white hover:bg-rose-800 shadow-sm",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-7 px-2.5 text-[12px]",
        lg: "h-10 px-5",
        icon: "h-9 w-9 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
