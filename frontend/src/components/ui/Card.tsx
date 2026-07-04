import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({ children, className = "", padding = "md" }: CardProps) {
  return (
    <div
      className={`rounded-3xl border border-border-subtle bg-surface shadow-[0_4px_20px_rgba(0,0,0,0.02)] ${paddingStyles[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
