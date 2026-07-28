"use client";

import { useState } from "react";
import { Check, Gauge, Maximize2, Signal } from "lucide-react";
import { StreamQuality, STREAM_QUALITIES } from "@/lib/halcyon-api";
import { formatHour, WorldBaseline, worldGradient } from "@/lib/halcyon-worlds";
import { cn } from "@/lib/utils";

export function LaunchConsole({
  world,
  quality,
  onQualityChange,
  consent,
  onConsentChange,
  onEnter,
  busy,
}: {
  world: WorldBaseline;
  quality: StreamQuality;
  onQualityChange: (next: StreamQuality) => void;
  consent: boolean;
  onConsentChange: (next: boolean) => void;
  onEnter: () => void;
  busy: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const active = STREAM_QUALITIES.find((option) => option.id === quality) ?? STREAM_QUALITIES[1];

  return (
    <div className="hal-console">
      <div className="hal-console-preview" style={{ background: worldGradient(world) }}>
        <div className="hal-console-preview-meta">
          <span className="hal-console-world">{world.label}</span>
          <span className="hal-console-hour">{formatHour(world.timeOfDay)} local</span>
        </div>
        <div className="hal-console-scanline" aria-hidden="true" />
      </div>

      <div className="hal-console-body">
        <div className="hal-console-row">
          <div className="flex items-center gap-2">
            <Gauge size={14} className="hal-console-icon" />
            <span className="hal-console-label">Fidelity</span>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="hal-console-toggle"
          >
            {active.resolution} · {active.label}
          </button>
        </div>

        {expanded ? (
          <div className="hal-quality-list">
            {STREAM_QUALITIES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onQualityChange(option.id);
                  setExpanded(false);
                }}
                className={cn("hal-quality", option.id === quality && "hal-quality-on")}
              >
                <span className="hal-quality-head">
                  <span className="hal-quality-res">{option.resolution}</span>
                  <span className="hal-quality-name">{option.label}</span>
                  {option.id === quality ? <Check size={13} className="ml-auto" /> : null}
                </span>
                <span className="hal-quality-detail">{option.detail}</span>
                <span className="hal-quality-bitrate">
                  <Signal size={11} />
                  {option.bitrate}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="hal-console-divider" />

        <button
          type="button"
          onClick={() => onConsentChange(!consent)}
          className="hal-console-consent"
        >
          <span className={cn("hal-consent-box", consent && "hal-consent-box-on")} />
          <span>
            Keep what I say. Off by default — without it only the shape of the session is
            stored, never the words.
          </span>
        </button>

        <button type="button" onClick={onEnter} disabled={busy} className="hal-console-enter">
          <Maximize2 size={15} />
          {busy ? "Opening…" : "Go in"}
        </button>
      </div>
    </div>
  );
}
