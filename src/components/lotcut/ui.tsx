import type { ButtonHTMLAttributes } from "react";

const VARIANTS = {
  primary: "bg-primary text-ink",
  ghost: "border border-line bg-surface text-fg",
  quiet: "bg-transparent text-fg px-2",
} as const;

export function Button({
  variant = "ghost",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function FieldLabel({ children }: { children: string }) {
  return <span className="text-sm text-muted">{children}</span>;
}

export const fieldClass =
  "w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-fg outline-none";
