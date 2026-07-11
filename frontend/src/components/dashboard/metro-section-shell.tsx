"use client";

import { ReactNode } from "react";
import { DashboardTopbar } from "@/components/dashboard-topbar";

export function MetroSectionShell({
  title,
  booting,
  loading,
  hasSession,
  isDemo,
  error,
  onBoardReview,
  onBack,
  children,
}: {
  title: string;
  booting: boolean;
  loading: boolean;
  hasSession: boolean;
  isDemo?: boolean;
  error: string;
  onBoardReview: () => void;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="metro-grid-fade flex h-full min-w-0 flex-1 flex-col gap-3 sm:gap-4">
      <DashboardTopbar
        title={title}
        booting={booting}
        loading={loading}
        hasSession={hasSession}
        isDemo={isDemo}
        onBoardReview={onBoardReview}
        onBack={onBack}
      />

      {error ? (
        <div className="glass shrink-0 rounded-md border border-ember/30 px-3 py-2 text-xs font-semibold text-ember">{error}</div>
      ) : null}

      <div className="command-scroll min-h-0 flex-1 overflow-y-auto rounded-lg">{children}</div>
    </div>
  );
}
