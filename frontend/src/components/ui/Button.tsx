import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-eva-500 text-white hover:bg-eva-600 active:bg-eva-700 focus-visible:ring-eva-400",
  secondary:
    "bg-lavender-100 text-lavender-800 hover:bg-lavender-200 active:bg-lavender-300 focus-visible:ring-lavender-400",
  ghost:
    "bg-transparent text-text-secondary hover:bg-surface-alt active:bg-gray-100 focus-visible:ring-gray-300",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}