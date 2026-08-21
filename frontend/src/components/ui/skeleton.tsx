import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Skeleton — always shape it like the content it replaces. A skeleton that
 * does not match the final layout causes a jump on load, which is worse than
 * a spinner.
 */
export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cn("skeleton", className)} style={style} aria-hidden="true" />
  );
}

/** Convenience: n lines of text, last one short, like real prose. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-3"
          style={{
            width: index === lines - 1 ? "62%" : "100%",
            animationDelay: `${index * 90}ms`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * EmptyState — one component so all seven dashboard sections say nothing in
 * the same voice.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ui-empty", className)}>
      {Icon ? (
        <span className="ui-empty-icon">
          <Icon size={20} strokeWidth={1.75} />
        </span>
      ) : null}
      <p className="ui-empty-title">{title}</p>
      {body ? <p className="ui-empty-body">{body}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
