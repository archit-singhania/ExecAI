// Raster exports of the repository's original SVG for mobile home-screen support.
import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
const svg = await readFile(new URL("../public/brand/compass.svg", import.meta.url), "utf8");
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || "chromium", headless: true });
try {
  const page = await browser.newPage();
  for (const size of [180, 192, 512]) {
    const encoded = await page.evaluate(async ({ svg, size }) => {
      const logo = new Image();
      logo.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      await logo.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      canvas.getContext("2d").drawImage(logo, 0, 0, size, size);
      return canvas.toDataURL("image/png").split(",")[1];
    }, { svg, size });
    await writeFile(new URL(`../public/brand/compass-${size}.png`, import.meta.url), Buffer.from(encoded, "base64"));
  }
} finally { await browser.close(); }
