
import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "md", ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-2xl transition px-4 py-2";
    const variants = {
      default: "bg-black text-white hover:opacity-90",
      outline: "border border-gray-300 bg-white hover:bg-gray-50",
    } as const;
    const sizes = {
      sm: "text-xs h-8 px-3",
      md: "text-sm h-10 px-4",
      lg: "text-base h-12 px-5",
    } as const;
    const cls = [base, variants[variant], sizes[size], className].join(" ");
    return <button ref={ref} className={cls} {...props} />;
  }
);
Button.displayName = "Button";
