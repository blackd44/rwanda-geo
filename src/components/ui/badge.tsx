import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium leading-none",
  {
    variants: {
      variant: {
        default: "border-white/10 bg-white/5 text-zinc-200",
        secondary: "border-white/10 bg-zinc-100 text-zinc-900",
        outline: "border-white/15 bg-transparent text-zinc-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
