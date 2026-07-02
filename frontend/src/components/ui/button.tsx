import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "quiet";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-ink text-fog shadow-soft hover:opacity-90",
        variant === "ghost" &&
          "border border-ink/10 bg-white/55 text-ink hover:bg-white dark:bg-white/5 dark:hover:bg-white/10",
        variant === "quiet" && "text-ink/70 hover:bg-ink/5 hover:text-ink",
        className
      )}
      {...props}
    />
  );
}
