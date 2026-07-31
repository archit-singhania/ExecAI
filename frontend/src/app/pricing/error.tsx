"use client";

import { RouteError } from "@/components/ui/route-error";

export default function PricingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError error={error} reset={reset} area="Pricing" backHref="/" backLabel="Home" />;
}
