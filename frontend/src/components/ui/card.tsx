import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Elev = 0 | 1 | 2 | 3 | 4;
type Pad = "none" | "sm" | "md" | "lg";

/**
 * The single surface primitive. Replaces .sec-card, .sec-panel, .pr-card,
 * .set-card, .hal-panel, .glass and .glass-strong.
 *
 *   <Card pad="md">…</Card>
 *   <Card elev={3} interactive onClick={…}>…</Card>
 */
export function Card({
  children,
  className,
  elev = 2,
  pad = "md",
  tone,
  interactive,
  as,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  elev?: Elev;
  pad?: Pad;
  tone?: "critical";
  interactive?: boolean;
  as?: "div" | "button" | "article" | "section" | "li";
} & React.HTMLAttributes<HTMLElement>) {
  const Tag = (as ?? (interactive ? "button" : "div")) as "div";

  return (
    <Tag
      className={cn("ui-card", className)}
      data-elev={elev}
      data-pad={pad === "none" ? undefined : pad}
      data-tone={tone}
      data-interactive={interactive ? "" : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ui-card-head", className)}>
      <div className="min-w-0">
        <h3 className="ui-card-title">{title}</h3>
        {description ? <p className="ui-card-desc">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("ui-card-foot", className)}>{children}</div>;
}
