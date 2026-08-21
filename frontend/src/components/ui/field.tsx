"use client";

import { ChevronDown, Check, AlertCircle } from "lucide-react";
import { ReactNode, useId } from "react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   Field — label + control + hint/error, wired together with real ids so the
   accessible name and description are actually announced. Every form in the
   app previously re-implemented this from scratch.
--------------------------------------------------------------------------- */

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  /** Receives the ids to attach to the control. */
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": boolean | undefined;
  }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className={cn("ui-field", className)}>
      {label ? (
        <label
          htmlFor={id}
          className={cn("ui-label", required && "ui-label-required")}
        >
          {label}
        </label>
      ) : null}

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}

      {error ? (
        <p id={errorId} className="ui-error" role="alert">
          <AlertCircle size={12} />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="ui-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------------- */

export function Input({
  className,
  icon,
  suffix,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: ReactNode;
  /** Trailing control, e.g. a password reveal toggle. */
  suffix?: ReactNode;
}) {
  if (!icon && !suffix) {
    return <input className={cn("ui-input", className)} {...rest} />;
  }

  return (
    <div className="ui-input-wrap">
      {icon ? <span className="ui-input-icon">{icon}</span> : null}
      <input
        className={cn("ui-input", !icon && "pl-3", suffix && "pr-10", className)}
        {...rest}
      />
      {suffix ? <span className="ui-input-suffix">{suffix}</span> : null}
    </div>
  );
}

export function Textarea({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("ui-textarea", className)} {...rest} />;
}

export function Select({
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="ui-select-wrap">
      <select className={cn("ui-select", className)} {...rest}>
        {children}
      </select>
      <ChevronDown size={15} className="ui-select-caret" />
    </div>
  );
}

/* --------------------------------------------------------------------------- */

export function Checkbox({
  label,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cn("ui-check", className)}>
      <input type="checkbox" {...rest} />
      <span className="ui-check-box" aria-hidden="true">
        <Check size={12} strokeWidth={3} />
      </span>
      <span className="ui-check-text">{label}</span>
    </label>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  /** Required — a switch with no accessible name is unusable. */
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      data-on={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn("ui-switch", className)}
    >
      <span className="ui-switch-thumb" />
    </button>
  );
}
