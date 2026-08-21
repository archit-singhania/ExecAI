"use client";

import { useCountUp } from "@/lib/use-count-up";
import { cn } from "@/lib/utils";

/**
 * A number that animates to its value and never reflows while doing so.
 *
 *   <AnimatedNumber value={healthScore} suffix="%" />
 *   <AnimatedNumber value={runway} suffix="mo" duration={700} />
 *
 * The `tabular` class (see premium.css) is applied here rather than left to
 * the caller, because forgetting it is the single easiest way to make a
 * counting number look cheap.
 */
export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 900,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const display = useCountUp(value, { duration, decimals });

  return (
    <span className={cn("tabular", className)}>
      {/* Screen readers get the final value immediately, not each frame. */}
      <span className="visually-hidden">{`${prefix}${value.toFixed(decimals)}${suffix}`}</span>
      <span aria-hidden="true">
        {prefix}
        {display.toFixed(decimals)}
        {suffix}
      </span>
    </span>
  );
}
