import * as React from "react";

import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantClass =
    variant === "secondary"
      ? "bg-foreground/5 text-foreground"
      : variant === "destructive"
        ? "bg-red-600/10 text-red-600"
        : "bg-foreground/10 text-foreground";

  return <div className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", variantClass, className)} {...props} />;
}

