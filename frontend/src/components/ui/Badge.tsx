import type { ReactNode } from "react";

type BadgeVariant = "menstruacion" | "folicular" | "ovulacion" | "lutea" | "default";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  menstruacion: "bg-menstrual-pink text-primary border border-primary/20",
  folicular: "bg-follicular-green text-tertiary border border-tertiary/20",
  ovulacion: "bg-ovulation-purple text-secondary border border-secondary/20",
  lutea: "bg-luteal-yellow text-warning-orange border border-warning-orange/20",
  default: "bg-surface-container-high text-on-surface-variant border border-border-subtle",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
