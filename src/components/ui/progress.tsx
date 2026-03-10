import * as React from "react";

import { cn } from "@/lib/cn";

export function Progress({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 w-full rounded-full bg-zinc-100", className)}>
      <div
        className="h-2 rounded-full bg-[var(--ap-accent)] transition-[width]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
