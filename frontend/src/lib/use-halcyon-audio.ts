"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Ambient audio for Halcyon, synthesised rather than sampled.
 *
 * No audio files: filtered noise for wind and water, a slow detuned drone
 * for the pad. That keeps the bundle unchanged and lets the sound respond
 * continuously to environment state rather than crossfading between clips.
 *
 * Browsers block audio until a user gesture, so nothing starts until
 * `enable()` is called from a click or tap.
 */

type Nodes = {
  ctx: AudioContext;
  master: GainNode;
  windGain: GainNode;
  windFilter: BiquadFilterNode;
  waterGain: GainNode;
  waterFilter: BiquadFilterNode;
  padGain: GainNode;
  oscillators: OscillatorNode[];
  noise: AudioBufferSourceNode;
};

function makeNoiseBuffer(ctx: AudioContext) {
  const seconds = 4;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let last = 0;
  for (let index = 0; index < data.length; index += 1) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[index] = last * 3.2;
  }

  return buffer;
}

export function useHalcyonAudio() {
  const nodesRef = useRef<Nodes | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [muted, setMuted] = useState(false);

  const enable = useCallback(async () => {
    if (nodesRef.current) {
      await nodesRef.current.ctx.resume();
      setEnabled(true);
      return;
    }

    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const buffer = makeNoiseBuffer(ctx);

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.value = 480;
    windFilter.Q.value = 0.6;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.06;

    const waterFilter = ctx.createBiquadFilter();
    waterFilter.type = "lowpass";
    waterFilter.frequency.value = 900;

    const waterGain = ctx.createGain();
    waterGain.gain.value = 0.04;

    noise.connect(windFilter).connect(windGain).connect(master);
    noise.connect(waterFilter).connect(waterGain).connect(master);
    noise.start();

    const padGain = ctx.createGain();
    padGain.gain.value = 0.03;
    padGain.connect(master);

    const oscillators = [110, 164.81, 220].map((frequency, index) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = frequency;
      osc.detune.value = index * 4 - 4;

      const gain = ctx.createGain();
      gain.gain.value = 0.34 / (index + 1);
      osc.connect(gain).connect(padGain);
      osc.start();
      return osc;
    });

    nodesRef.current = {
      ctx,
      master,
      windGain,
      windFilter,
      waterGain,
      waterFilter,
      padGain,
      oscillators,
      noise,
    };

    master.gain.setTargetAtTime(0.5, ctx.currentTime, 2.2);
    setEnabled(true);
  }, []);

  const apply = useCallback(
    (state: { wind: number; waterMotion: number; brightness: number; breathing: boolean }) => {
      const nodes = nodesRef.current;
      if (!nodes) return;

      const { ctx } = nodes;
      const now = ctx.currentTime;
      const ramp = 6;

      nodes.windGain.gain.setTargetAtTime(0.02 + state.wind * 0.11, now, ramp);
      nodes.windFilter.frequency.setTargetAtTime(300 + state.wind * 900, now, ramp);

      nodes.waterGain.gain.setTargetAtTime(0.015 + state.waterMotion * 0.1, now, ramp);
      nodes.waterFilter.frequency.setTargetAtTime(500 + state.waterMotion * 1800, now, ramp);

      nodes.padGain.gain.setTargetAtTime(state.breathing ? 0.055 : 0.026, now, ramp);

      nodes.oscillators.forEach((osc, index) => {
        const base = [110, 164.81, 220][index];
        osc.frequency.setTargetAtTime(base * (0.97 + state.brightness * 0.06), now, ramp * 2);
      });
    },
    [],
  );

  const toggleMute = useCallback(() => {
    const nodes = nodesRef.current;
    if (!nodes) return;

    const next = !muted;
    setMuted(next);
    nodes.master.gain.setTargetAtTime(next ? 0 : 0.5, nodes.ctx.currentTime, 0.6);
  }, [muted]);

  useEffect(() => {
    return () => {
      const nodes = nodesRef.current;
      if (!nodes) return;
      try {
        nodes.oscillators.forEach((osc) => osc.stop());
        nodes.noise.stop();
        nodes.ctx.close();
      } catch {
        /* already torn down */
      }
      nodesRef.current = null;
    };
  }, []);

  return { enable, apply, toggleMute, enabled, muted };
}
