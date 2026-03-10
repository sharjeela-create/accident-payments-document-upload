import * as React from "react";

import { cn } from "@/lib/cn";

type AlertVariant = "info" | "success" | "warning" | "danger";

const variants: Record<AlertVariant, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-rose-200 bg-rose-50 text-rose-900",
};

export function Alert({
  className,
  variant = "info",
  title,
  children,
}: {
  className?: string;
  variant?: AlertVariant;
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        variants[variant],
        className
      )}
      role={variant === "danger" ? "alert" : "status"}
    >
      {title ? <div className="mb-1 font-semibold">{title}</div> : null}
      {children}
    </div>
  );
}
