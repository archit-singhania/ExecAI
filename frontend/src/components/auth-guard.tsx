"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getToken, isDemoSession } from "@/lib/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isDemoSession()) { setChecked(true); return; }
    const token = getToken();
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/auth/me`, { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error("Sign in required"); return r.json(); })
      .then(() => setChecked(true))
      .catch(() => router.replace("/login"));
  }, [router]);

  if (!checked) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-radial-ui text-ink">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    );
  }

  return <>{children}</>;
}
