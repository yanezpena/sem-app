#!/usr/bin/env node
/**
 * Generates app icon assets for Expense Tracker.
 * Run from apps/mobile: node scripts/generate-app-icon.mjs
 * Requires: pnpm add -D sharp
 */
import sharp from "sharp";
import { mkdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, "..", "assets", "images");
const SIZE = 1024;
const PRIMARY = "#4f46e5";
const WHITE = "#ffffff";
const RADIUS = 200;

// Bold "E" for Expense: vertical bar + 3 horizontals (no font needed, very visible)
const ePath = "M-140 -160 L-140 160 M-140 -160 L120 -160 M-140 0 L80 0 M-140 160 L120 160";

// Full icon: gradient background + bold white E
const svgIconFull = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#4f46e5"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-opacity="0.2"/>
    </filter>
  </defs>
  <rect x="112" y="112" width="800" height="800" rx="${RADIUS}" ry="${RADIUS}" fill="url(#bg)" filter="url(#shadow)"/>
  <g transform="translate(512,512)" fill="none" stroke="${WHITE}" stroke-width="72" stroke-linecap="round" stroke-linejoin="round">
    <path d="${ePath}"/>
  </g>
</svg>`;

const svgForeground = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect x="112" y="112" width="800" height="800" rx="${RADIUS}" ry="${RADIUS}" fill="${PRIMARY}"/>
  <g transform="translate(512,512)" fill="none" stroke="${WHITE}" stroke-width="72" stroke-linecap="round" stroke-linejoin="round">
    <path d="${ePath}"/>
  </g>
</svg>`;

// Single color on transparent for Android 13+ themed icon (OS tints)
const svgMonochrome = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect x="112" y="112" width="800" height="800" rx="${RADIUS}" ry="${RADIUS}" fill="#000"/>
  <g transform="translate(512,512)" fill="none" stroke="#000" stroke-width="72" stroke-linecap="round" stroke-linejoin="round">
    <path d="${ePath}"/>
  </g>
</svg>`;

async function main() {
  await mkdir(ASSETS, { recursive: true });

  const bufferFull = Buffer.from(svgIconFull);
  const bufferForeground = Buffer.from(svgForeground);
  const bufferMonochrome = Buffer.from(svgMonochrome);

  await sharp(bufferFull)
    .resize(SIZE, SIZE)
    .png()
    .toFile(join(ASSETS, "icon.png"));

  await sharp(bufferFull)
    .resize(SIZE, SIZE)
    .png()
    .toFile(join(ASSETS, "splash-icon.png"));

  await sharp(bufferForeground)
    .resize(SIZE, SIZE)
    .png()
    .toFile(join(ASSETS, "android-icon-foreground.png"));

  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 79, g: 70, b: 229, alpha: 1 } },
  })
    .png()
    .toFile(join(ASSETS, "android-icon-background.png"));

  await sharp(bufferMonochrome)
    .resize(SIZE, SIZE)
    .png()
    .toFile(join(ASSETS, "android-icon-monochrome.png"));

  await sharp(bufferFull)
    .resize(48, 48)
    .png()
    .toFile(join(ASSETS, "favicon.png"));

  console.log("Generated: icon.png, splash-icon.png, android-icon-foreground.png, android-icon-background.png, android-icon-monochrome.png, favicon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
