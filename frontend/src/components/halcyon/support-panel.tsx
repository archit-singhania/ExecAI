"use client";

import { ArrowUpRight } from "lucide-react";
import { SupportResource } from "@/lib/halcyon-api";

/**
 * Deliberately not a modal, not red, and not dismissible.
 *
 * A crisis panel that demands to be closed is one more thing to deal with at
 * the worst possible moment. This sits in the flow, stays for the rest of
 * the session, and asks nothing. A resource that scrolls away or has to be
 * dismissed was never really offered.
 */
export function SupportPanel({ resources }: { resources: SupportResource[] }) {
  if (!resources.length) return null;

  return (
    <aside className="hal-support" aria-label="Support">
      <p className="hal-support-title">People who can help</p>

      <ul className="hal-support-list">
        {resources.map((resource) => (
          <li key={resource.label} className="hal-support-item">
            {resource.url ? (
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hal-support-link"
              >
                {resource.label}
                <ArrowUpRight size={13} />
              </a>
            ) : (
              <span className="hal-support-link">{resource.label}</span>
            )}
            <span className="hal-support-detail">{resource.detail}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
