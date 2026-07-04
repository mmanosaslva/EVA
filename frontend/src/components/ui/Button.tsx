import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-container active:bg-primary/90 focus-visible:ring-primary-fixed-dim",
  secondary:
    "bg-secondary-fixed text-on-secondary-fixed-variant hover:bg-secondary-fixed-dim active:bg-secondary-container/30 focus-visible:ring-secondary-fixed-dim",
  ghost:
    "bg-transparent text-on-surface-variant hover:bg-surface-container-low active:bg-surface-container focus-visible:ring-outline-variant",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl px-6 py-3 text-label-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95 disabled:pointer-events-none disabled:opacity-50 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
