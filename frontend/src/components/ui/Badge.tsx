import type { ReactNode } from "react";

type BadgeVariant = "menstruacion" | "folicular" | "ovulacion" | "lutea" | "default";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  menstruacion: "bg-red-100 text-red-700",
  folicular: "bg-lavender-100 text-lavender-700",
  ovulacion: "bg-green-100 text-green-700",
  lutea: "bg-amber-100 text-amber-700",
  default: "bg-gray-100 text-gray-700",
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