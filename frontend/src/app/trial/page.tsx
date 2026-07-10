"use client";

import { useEffect, useState } from "react";
import { DemoIntroVideo } from "@/components/trial/demo-intro-video";
import { TrialExperience } from "@/components/trial/trial-experience";

const INTRO_SEEN_KEY = "trial_intro_seen";

export default function TrialPage() {
  const [introDone, setIntroDone] = useState<boolean | null>(null);

  useEffect(() => {
    const seen = window.sessionStorage.getItem(INTRO_SEEN_KEY) === "1";
    setIntroDone(seen);
  }, []);

  function finishIntro() {
    window.sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    setIntroDone(true);
  }

  if (introDone === null) {
    return <div className="fixed inset-0 bg-black" />;
  }

  if (!introDone) {
    return <DemoIntroVideo onDone={finishIntro} />;
  }

  return <TrialExperience />;
}
