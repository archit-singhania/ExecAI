"use client";

import { RouteError } from "@/components/ui/route-error";

export default function HalcyonError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError error={error} reset={reset} area="Halcyon" backHref="/halcyon" backLabel="Back to Halcyon" />;
}
