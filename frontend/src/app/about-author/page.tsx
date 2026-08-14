"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileCode2, TerminalSquare, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { PointCloudPortrait } from "@/components/ui/point-cloud-portrait";

const LINE_COUNT = 34;

const TAGS = [
  { label: "Founder", color: "#d9b467" },
  { label: "Product Builder", color: "#8fae52" },
  { label: "Strategic AI", color: "#c9754a" },
];

const RAMP =
  " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@";

function FullPortraitGlyph({ panelRef }: { panelRef?: React.RefObject<HTMLDivElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const image = new Image();
    image.src = "/images/author-source.jpg";

    const render = () => {
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height || !image.naturalWidth) return;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * pixelRatio);
      canvas.height = Math.round(bounds.height * pixelRatio);

      const context = canvas.getContext("2d");
      if (!context) return;

      const sample = document.createElement("canvas");
      const cropWidth = image.naturalWidth * 0.4;
      const cropHeight = image.naturalHeight * 0.71;
      const cropAspect = cropWidth / cropHeight;
      const boundsAspect = bounds.width / bounds.height;

      let renderWidth: number;
      let renderHeight: number;
      if (boundsAspect > cropAspect) {
        renderHeight = bounds.height;
        renderWidth = renderHeight * cropAspect;
      } else {
        renderWidth = bounds.width;
        renderHeight = renderWidth / cropAspect;
      }
      const offsetX = (bounds.width - renderWidth) / 2;
      const offsetY = (bounds.height - renderHeight) / 2;

      const panel = panelRef?.current;
      if (panel && window.innerWidth >= 1024) {
        const chrome = panel.offsetWidth - bounds.width;
        const nextWidth = Math.ceil(renderWidth + chrome);
        if (Math.abs(panel.offsetWidth - nextWidth) > 1) {
          panel.style.width = `${nextWidth}px`;
        }
      }

      const cellAspect = 0.5;
      const columns = Math.max(190, Math.floor(renderWidth / 2.2));
      const rows = Math.max(130, Math.floor((renderHeight / (2.2 / cellAspect)) * 1.0));

      sample.width = columns;
      sample.height = rows;
      const sampleContext = sample.getContext("2d", { willReadFrequently: true });
      if (!sampleContext) return;

      sampleContext.imageSmoothingEnabled = true;
      sampleContext.imageSmoothingQuality = "high";
      sampleContext.drawImage(
        image,
        image.naturalWidth * 0.34,
        image.naturalHeight * 0.29,
        cropWidth,
        cropHeight,
        0,
        0,
        columns,
        rows,
      );

      const pixels = sampleContext.getImageData(0, 0, columns, rows).data;
      const count = columns * rows;

      const luminance = new Float32Array(count);
      for (let index = 0; index < count; index += 1) {
        const pixel = index * 4;
        luminance[index] =
          pixels[pixel] * 0.2126 + pixels[pixel + 1] * 0.7152 + pixels[pixel + 2] * 0.0722;
      }

      const histogram = new Uint32Array(256);
      for (let index = 0; index < count; index += 1) {
        histogram[luminance[index] | 0] += 1;
      }

      const lowTarget = count * 0.015;
      const highTarget = count * 0.985;
      let cumulative = 0;
      let blackPoint = 0;
      let whitePoint = 255;
      for (let level = 0; level < 256; level += 1) {
        cumulative += histogram[level];
        if (cumulative <= lowTarget) blackPoint = level;
        if (cumulative <= highTarget) whitePoint = level;
      }
      const span = Math.max(1, whitePoint - blackPoint);

      const at = (row: number, column: number) => {
        const r = row < 0 ? 0 : row >= rows ? rows - 1 : row;
        const c = column < 0 ? 0 : column >= columns ? columns - 1 : column;
        return luminance[r * columns + c];
      };

      const blurred = new Float32Array(count);
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          blurred[row * columns + column] =
            (at(row - 1, column - 1) +
              at(row - 1, column) +
              at(row - 1, column + 1) +
              at(row, column - 1) +
              at(row, column) +
              at(row, column + 1) +
              at(row + 1, column - 1) +
              at(row + 1, column) +
              at(row + 1, column + 1)) /
            9;
        }
      }

      const prepared = new Float32Array(count);
      for (let index = 0; index < count; index += 1) {
        const sharpened = luminance[index] + (luminance[index] - blurred[index]) * 0.85;
        const levelled = ((sharpened - blackPoint) / span) * 255;
        const normalized = Math.min(1, Math.max(0, levelled / 255));
        prepared[index] = Math.pow(normalized, 0.78) * 255;
      }

      const cellWidth = renderWidth / columns;
      const cellHeight = renderHeight / rows;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.fillStyle = "#060605";
      context.fillRect(0, 0, bounds.width, bounds.height);
      context.font = `${(cellHeight * 1.06).toFixed(2)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.textBaseline = "top";

      const steps = RAMP.length - 1;
      const error = new Float32Array(count);

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const index = row * columns + column;
          const value = Math.min(255, Math.max(0, prepared[index] + error[index]));

          const level = Math.round((value / 255) * steps);
          const quantized = (level / steps) * 255;
          const residual = value - quantized;

          if (column + 1 < columns) error[index + 1] += (residual * 7) / 16;
          if (row + 1 < rows) {
            if (column > 0) error[index + columns - 1] += (residual * 3) / 16;
            error[index + columns] += (residual * 5) / 16;
            if (column + 1 < columns) error[index + columns + 1] += residual / 16;
          }

          const glyph = RAMP[level];
          if (glyph === " ") continue;

          const tone = Math.min(255, quantized * 1.1 + 26);
          context.fillStyle = `rgb(${Math.round(tone)}, ${Math.round(tone * 0.9)}, ${Math.round(
            tone * 0.62,
          )})`;
          context.fillText(glyph, offsetX + column * cellWidth, offsetY + row * cellHeight);
        }
      }
    };

    image.addEventListener("load", render);
    const resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(canvas);

    return () => {
      image.removeEventListener("load", render);
      resizeObserver.disconnect();
    };
  }, [panelRef]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full"
      aria-label="Typographic portrait of the author rendered in monospace glyphs"
    />
  );
}

function RealisticGlyph({ panelRef }: { panelRef?: React.RefObject<HTMLDivElement | null> }) {
  const [cloud, setCloud] = useState(false);

  return (
    <div className="glyph-portrait relative h-full w-full overflow-hidden">
      <div className="glyph-portrait-halo pointer-events-none absolute inset-0" />

      <button
        type="button"
        onClick={() => setCloud((current) => !current)}
        className="glyph-toggle"
        title={cloud ? "Show glyph render" : "Show point cloud"}
      >
        {cloud ? "Glyphs" : "Particles"}
      </button>

      <div className="relative z-10 h-full w-full">
        {cloud ? (
          <PointCloudPortrait src="/images/author-source.jpg" height={520} />
        ) : (
          <FullPortraitGlyph panelRef={panelRef} />
        )}
      </div>
    </div>
  );
}

export default function AboutAuthorPage() {
  const gutter = Array.from({ length: LINE_COUNT }, (_, index) => index + 1);
  const glyphPanelRef = useRef<HTMLDivElement>(null);

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-radial-ui text-ink">
      <div className="scanline pointer-events-none absolute inset-0" />
      <AnimatedBackground />
      <div className="top-beam" />

      <div className="relative mx-auto flex h-full max-w-[1600px] flex-col px-4 py-5 sm:px-6 lg:px-10">
        <div className="flex shrink-0 items-center justify-between pb-5 sm:pb-7">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md border border-ink/10 bg-white/60 px-3.5 py-2 text-[0.7rem] font-black uppercase tracking-widest text-steel shadow-line backdrop-blur transition hover:border-accent/40 hover:text-accent dark:border-fog/10 dark:bg-white/5 dark:shadow-line-dark"
          >
            <ArrowLeft size={13} />
            Back
          </Link>
          <div className="flex items-center gap-2.5">
            <Logo size={32} />
            <span className="text-sm font-black tracking-tight">CEO.ai</span>
          </div>
        </div>

        <div className="animate-rise pb-5 sm:pb-7">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-accent">
            Founder&apos;s Note
          </p>
          <h1 className="mt-2 font-serif text-[2.1rem] italic leading-tight text-ink sm:text-[2.6rem] lg:text-[3rem]">
            On the discipline of being argued with.
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {TAGS.map((tag) => (
              <span
                key={tag.label}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest"
                style={{
                  borderColor: `${tag.color}55`,
                  color: tag.color,
                  background: `${tag.color}14`,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: tag.color }} />
                {tag.label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 pb-4 lg:grid-cols-[auto_1fr] lg:gap-8">
          <div
            ref={glyphPanelRef}
            className="animate-rise flex min-h-0 w-full flex-col overflow-hidden rounded-xl border shadow-glass lg:w-[420px]"
            style={{
              borderColor: "rgba(217,180,103,0.28)",
              boxShadow: "0 30px 90px rgba(0,0,0,0.35), 0 0 0 1px rgba(217,180,103,0.08) inset",
            }}
          >
            <div
              className="flex items-center gap-1.5 border-b px-4 py-3"
              style={{ borderColor: "rgba(217,180,103,0.16)", background: "#15130f" }}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#d9704f" }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#8fae52" }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#d9b467" }} />
              <span
                className="ml-2 flex items-center gap-1.5 text-[0.68rem] font-bold"
                style={{ color: "#d9b46799" }}
              >
                <TerminalSquare size={12} />
                author.glyph
              </span>
              <span
                className="ml-auto flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-widest"
                style={{ color: "#8fae5299" }}
              >
                <Sparkles size={11} />
                dithered · 70 levels
              </span>
            </div>

            <div
              className="relative flex min-h-0 flex-1 overflow-hidden"
              style={{
                background:
                  "radial-gradient(circle at 50% 22%, rgba(217,180,103,0.19), transparent 48%), radial-gradient(circle at 15% 85%, rgba(143,174,82,0.12), transparent 52%), #060605",
              }}
            >
              <RealisticGlyph panelRef={glyphPanelRef} />
            </div>
          </div>

          <div
            className="animate-rise flex min-h-0 flex-col overflow-hidden rounded-xl border shadow-glass"
            style={{
              animationDelay: "90ms",
              borderColor: "rgba(217,180,103,0.28)",
              boxShadow: "0 30px 90px rgba(0,0,0,0.35), 0 0 0 1px rgba(217,180,103,0.08) inset",
            }}
          >
            <div
              className="flex items-center border-b"
              style={{ borderColor: "rgba(217,180,103,0.16)", background: "#15130f" }}
            >
              <div
                className="flex items-center gap-2 border-r px-4 py-3"
                style={{
                  borderColor: "rgba(217,180,103,0.16)",
                  borderTop: "2px solid #d9b467",
                  background: "#0a0908",
                }}
              >
                <FileCode2 size={13} style={{ color: "#d9b467" }} />
                <span className="text-xs font-bold" style={{ color: "#ece7dbdd" }}>
                  about-author.md
                </span>
              </div>
              <div
                className="hidden flex-1 px-4 py-3 text-[0.65rem] sm:block"
                style={{ color: "#8b857766" }}
              >
                CEOAI &mdash; workspace
              </div>
            </div>

            <div className="flex min-h-0 flex-1 overflow-auto" style={{ background: "#0a0908" }}>
              <div
                className="select-none border-r px-3 py-7 text-right font-mono text-[0.72rem] leading-7 sm:px-4"
                style={{ borderColor: "rgba(217,180,103,0.12)", color: "#5c574c" }}
              >
                {gutter.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>

              <div className="flex-1 px-5 py-7 font-mono text-[0.85rem] leading-8 tracking-[0.01em] sm:px-8 sm:text-[0.95rem]">
                <p>
                  <span style={{ color: "#e07850", fontWeight: 800, fontSize: "1.08em" }}>
                    # About the Author
                  </span>
                </p>
                <p className="mt-4">
                  <span style={{ color: "#9dc262", fontWeight: 800, fontSize: "1.02em" }}>## AS</span>
                </p>

                <p className="mt-5" style={{ color: "#e2ddd0" }}>
                  Most expensive mistakes are not made in ignorance. They are made with conviction.
                </p>

                <div
                  className="my-4 rounded-md border-l-2 py-3 pl-4 pr-3"
                  style={{ borderColor: "#e7c988", background: "rgba(217,180,103,0.09)" }}
                >
                  <p
                    className="font-serif text-[1.02rem] italic leading-relaxed"
                    style={{ color: "#f2d99e" }}
                  >
                    &ldquo;Judgment is not the absence of doubt. It is the discipline of holding
                    several at once, and knowing which one to act on.&rdquo;
                  </p>
                </div>

                <p className="mt-4 leading-8" style={{ color: "#e2ddd0" }}>
                  Almost every tool built on language models is optimised for the wrong thing:
                  fluency. They are rewarded for sounding certain, and certainty is precisely what a
                  founder least needs at the moment a decision is expensive and reversible only in
                  theory. A single confident answer flatters the person reading it. It rarely
                  survives contact with a market.
                </p>

                <p className="mt-4 leading-8" style={{ color: "#e2ddd0" }}>
                  CEOAI is built on the opposite premise. Nine specialists examine the same question
                  independently and are permitted to reach different conclusions. Where they diverge,
                  the divergence is shown rather than averaged into a comfortable middle. The distance
                  between your CFO and your CTO is not noise to be smoothed out. It is the most
                  honest signal in the room, and usually the location of the actual risk.
                </p>

                <p className="mt-4 leading-8" style={{ color: "#e2ddd0" }}>
                  What follows from that is accountability. Advice is cheap and endlessly available;
                  what remains scarce is the structure that remembers what you committed to and asks
                  about it later. The board convenes on a schedule, scores what moved, and names what
                  did not &mdash; whether or not you open the application that week.
                </p>

                <p className="mt-5" style={{ color: "#a39d8c" }}>
                  # Three principles hold the work together:
                </p>
                <ul className="mt-2 space-y-1.5">
                  <li style={{ color: "#e2ddd0" }}>
                    <span style={{ color: "#e7c988" }}>*</span> Prefer the uncomfortable question to
                    the comfortable answer.
                  </li>
                  <li style={{ color: "#e2ddd0" }}>
                    <span style={{ color: "#e7c988" }}>*</span> Show the disagreement; never average
                    it away.
                  </li>
                  <li style={{ color: "#e2ddd0" }}>
                    <span style={{ color: "#e7c988" }}>*</span> Judgment compounds. Opinions do not.
                  </li>
                </ul>

                <p className="mt-5 leading-8" style={{ color: "#e2ddd0" }}>
                  The ambition is not another assistant. It is an executive instrument &mdash; a
                  standing institution rather than a conversation &mdash; that makes rigorous thinking
                  available to people who cannot yet hire a board, and makes it harder for anyone to
                  mistake eloquence for evidence.
                </p>

                <p className="mt-4" style={{ color: "#e2ddd0" }}>
                  Thank you for reading, and for building something worth arguing about.
                </p>

                <p className="mt-6" style={{ color: "#75705f" }}>
                  &mdash;
                </p>
                <p className="mt-1">
                  <span style={{ color: "#f2d99e", fontWeight: 800, fontSize: "1.02em" }}>**AS**</span>
                </p>
                <p style={{ color: "#a39d8c" }}>
                  Founder &amp; Creator, CEOAI
                  <span
                    className="ml-1 inline-block w-[7px] translate-y-[2px]"
                    style={{
                      height: "1rem",
                      background: "#e7c988",
                      animation: "blink 1.1s steps(1) infinite",
                    }}
                  />
                </p>
              </div>
            </div>

            <div
              className="flex items-center justify-between border-t px-4 py-2.5 text-[0.6rem] font-bold uppercase tracking-widest"
              style={{
                borderColor: "rgba(217,180,103,0.16)",
                background: "#15130f",
                color: "#8b857799",
              }}
            >
              <span>Markdown</span>
              <span>UTF-8 &middot; LF &middot; Spaces: 2</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 45% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>
    </main>
  );
}
