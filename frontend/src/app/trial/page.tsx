"use client";

import { useState } from "react";
import { DemoIntroVideo } from "@/components/trial/demo-intro-video";
import { TrialExperience } from "@/components/trial/trial-experience";

export default function TrialPage() {
  const [introDone, setIntroDone] = useState(false);

  if (!introDone) {
    return <DemoIntroVideo onDone={() => setIntroDone(true)} />;
  }

  return <TrialExperience />;
}
