import * as React from "react";

import { cn } from "@/lib/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string | null;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="space-y-1">
        <input
          ref={ref}
          type={type}
          className={cn(
            "h-11 w-full rounded-md border bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm outline-none transition-colors",
            "border-zinc-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20",
            error ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20" : "",
            className
          )}
          {...props}
        />
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      </div>
    );
  }
);
Input.displayName = "Input";
