import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({ className, variant = "default", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-depot-500 disabled:opacity-50 disabled:cursor-not-allowed",
        {
          "bg-depot-600 text-white hover:bg-depot-500": variant === "default",
          "border border-gray-700 text-gray-300 hover:bg-gray-800": variant === "outline",
          "text-gray-400 hover:text-gray-200 hover:bg-gray-800": variant === "ghost",
        },
        {
          "px-3 py-1.5 text-sm": size === "sm",
          "px-4 py-2 text-sm": size === "md",
          "px-6 py-3 text-base": size === "lg",
        },
        className,
      )}
      {...props}
    />
  );
}
