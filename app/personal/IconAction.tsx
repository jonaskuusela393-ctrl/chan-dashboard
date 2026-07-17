"use client";

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

export function IconAction({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      className={`icon-action ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}

export function IconLink({
  label,
  children,
  className = "",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { label: string; children: ReactNode }) {
  return (
    <a
      className={`buttonlike icon-action ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      <span aria-hidden="true">{children}</span>
    </a>
  );
}

export function CompactStatus({ children, busy = false }: { children: ReactNode; busy?: boolean }) {
  return (
    <div className="personal-status" role="status" aria-live="polite">
      <span aria-hidden="true">{busy ? "…" : "·"}</span>
      <span>{children}</span>
    </div>
  );
}
