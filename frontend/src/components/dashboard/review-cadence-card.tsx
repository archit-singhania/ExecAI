"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Check, Loader2 } from "lucide-react";
import { api, ReviewCadence, ReviewSchedule } from "@/lib/api";
import { cn } from "@/lib/utils";

const CADENCES: { value: ReviewCadence; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ReviewCadenceCard({ isDemo }: { isDemo?: boolean }) {
  const [schedule, setSchedule] = useState<ReviewSchedule | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isDemo) {
      setSchedule({
        cadence: "weekly",
        weekday: 0,
        hour: 9,
        tz_offset_minutes: -new Date().getTimezoneOffset(),
        email_enabled: true,
        last_run_at: null,
        next_run_at: null,
      });
      setLoaded(true);
      return;
    }

    api
      .getReviewSchedule()
      .then(setSchedule)
      .catch(() => setError("Couldn't load your review cadence."))
      .finally(() => setLoaded(true));
  }, [isDemo]);

  async function persist(next: ReviewSchedule) {
    setSchedule(next);
    if (isDemo) return;

    setSaving(true);
    setError("");
    try {
      const saved = await api.updateReviewSchedule({
        cadence: next.cadence,
        weekday: next.weekday,
        hour: next.hour,
        tz_offset_minutes: -new Date().getTimezoneOffset(),
        email_enabled: next.email_enabled,
      });
      setSchedule(saved);
    } catch {
      setError("Couldn't save that. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <div className="sec-card rounded-lg p-4">
        <div className="sec-skel h-3 w-32 rounded-full" />
        <div className="sec-skel mt-3 h-9 w-full rounded-md" />
      </div>
    );
  }

  if (!schedule) return null;

  const active = schedule.cadence !== "off";

  return (
    <div className="sec-card rounded-lg p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock size={14} className="text-steel" />
          <p className="sec-eyebrow">Review cadence</p>
        </div>
        {saving ? <Loader2 size={13} className="animate-spin text-steel" /> : null}
      </div>

      <div className="sec-rail mb-3 flex gap-1 p-1">
        {CADENCES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => persist({ ...schedule, cadence: option.value })}
            aria-pressed={schedule.cadence === option.value}
            className={cn(
              "sec-rail-item flex-1 justify-center",
              schedule.cadence === option.value && "sec-rail-item-active",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {active ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {DAYS.map((day, index) => (
              <button
                key={day}
                type="button"
                onClick={() => persist({ ...schedule, weekday: index })}
                aria-pressed={schedule.weekday === index}
                className={cn("sec-day", schedule.weekday === index && "sec-day-active")}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="mb-3 flex items-center gap-2">
            <label htmlFor="review-hour" className="text-[0.75rem] font-semibold text-steel">
              at
            </label>
            <select
              id="review-hour"
              value={schedule.hour}
              onChange={(event) => persist({ ...schedule, hour: Number(event.target.value) })}
              className="sec-input h-8 rounded-md px-2 text-[0.78rem] font-semibold"
            >
              {Array.from({ length: 24 }).map((_, hour) => (
                <option key={hour} value={hour}>
                  {String(hour).padStart(2, "0")}:00
                </option>
              ))}
            </select>
            <span className="text-[0.72rem] font-semibold text-steel">your local time</span>
          </div>

          <button
            type="button"
            onClick={() => persist({ ...schedule, email_enabled: !schedule.email_enabled })}
            className="mb-3 flex items-center gap-2 text-left"
          >
            <span className={cn("sec-check grid h-4 w-4 place-items-center rounded", schedule.email_enabled && "sec-check-done")}>
              <Check size={10} strokeWidth={3.2} />
            </span>
            <span className="text-[0.78rem] font-semibold">Email me the verdict</span>
          </button>

          <p className="text-[0.75rem] font-medium leading-6 text-steel">
            {schedule.next_run_at
              ? `Next review ${new Date(schedule.next_run_at).toLocaleString([], {
                  weekday: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}.`
              : "The board convenes on this schedule whether or not you open the app."}
          </p>
        </>
      ) : (
        <p className="text-[0.75rem] font-medium leading-6 text-steel">
          Reviews are manual. Turn on a cadence and the board scores your progress on its own.
        </p>
      )}

      {error ? <p className="mt-2 text-[0.75rem] font-bold text-ember">{error}</p> : null}
      {isDemo ? (
        <p className="mt-2 text-[0.72rem] font-semibold text-steel">Demo mode — this cadence isn&apos;t saved.</p>
      ) : null}
    </div>
  );
}
