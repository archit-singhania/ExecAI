"use client";

import { useCallback, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import {
  DESIGN_COLLECTIONS,
  useTheme,
  type VisualComfort,
} from "@/components/theme-provider";

const OPTIONS: { key: keyof VisualComfort; label: string; detail: string }[] = [
  {
    key: "reducedMotion",
    label: "Reduce motion",
    detail: "Use immediate feedback instead of decorative movement.",
  },
  {
    key: "reducedTransparency",
    label: "Reduce transparency",
    detail: "Replace frosted glass with solid, readable surfaces.",
  },
  {
    key: "highContrast",
    label: "Increase contrast",
    detail: "Strengthen text, outlines, and selected controls.",
  },
];

export function VisualPreferences({ expanded = false }: { expanded?: boolean }) {
  const [open, setOpen] = useState(false);
  const { comfort, setComfort, collection, setCollection } = useTheme();
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        type="button"
        className={`visual-comfort-trigger ${expanded ? "is-expanded" : ""}`}
        aria-label="Visual comfort"
        title="Visual comfort"
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal size={17} />
        {expanded && <span>Visual comfort</span>}
      </button>
      <Dialog
        open={open}
        onClose={close}
        title="Visual comfort"
        className="visual-comfort-dialog"
        description="Make this workspace comfortable for you. Your system accessibility preferences are also respected."
      >
        <fieldset className="design-collections">
          <legend>Design collection</legend>
          <p>A coordinated accent and pair of light/dark surfaces.</p>
          {DESIGN_COLLECTIONS.map((item) => (
            <label key={item.id} className="design-collection">
              <span
                className="collection-swatch"
                style={{ background: `rgb(${item.accent})` }}
                aria-hidden="true"
              />
              <span>
                <strong>{item.name}</strong>
                <small>{item.detail}</small>
              </span>
              <input
                type="radio"
                name="design-collection"
                value={item.id}
                checked={collection === item.id}
                onChange={() => setCollection(item.id)}
              />
            </label>
          ))}
          {collection === "custom" && (
            <small>Your custom accent and surfaces are active.</small>
          )}
        </fieldset>
        <div className="visual-comfort-options">
          {OPTIONS.map(({ key, label, detail }) => (
            <label key={key} className="visual-comfort-option">
              <span>
                <strong>{label}</strong>
                <small>{detail}</small>
              </span>
              <input
                type="checkbox"
                checked={comfort[key]}
                onChange={(event) => setComfort(key, event.target.checked)}
              />
            </label>
          ))}
        </div>
        <p className="visual-comfort-note">
          Saved on this device, across every CEO.ai screen.
        </p>
      </Dialog>
    </>
  );
}
