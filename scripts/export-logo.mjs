import sharp from "sharp";
import { writeFileSync } from "fs";

/** Matches .brand-lockup-lg CSS — exported at 2× for crisp slides. */
const SCALE = 2;
const titleSize = 42 * SCALE;
const taglineSize = titleSize * 0.5;
const gap = titleSize * 0.1;
const padY = titleSize * 0.1;
const padX = titleSize * 0.45;
const letterSpacing = titleSize * -0.02;

const purple = "#6b5cff";
const ink = "#111827";
const yellow = "#f5b400";

const title = "StudyBuddyBoard";
const tagline = "Fuel The Grind";

// Approximate text metrics (Segoe UI / system stack).
const titleWidth = titleSize * 0.56 * title.length;
const taglineWidth = taglineSize * 0.52 * tagline.length;
const pillWidth = taglineWidth + padX * 2;
const pillHeight = taglineSize * 1.2 + padY * 2;
const titleHeight = titleSize * 1.1;

const width = Math.ceil(titleWidth + 16);
const height = Math.ceil(titleHeight + gap + pillHeight + 16);
const titleY = 12 + titleSize;
const pillY = 12 + titleHeight + gap;
const pillX = 0;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <text
    x="0"
    y="${titleY}"
    font-family="Segoe UI, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    font-size="${titleSize}"
    font-weight="800"
    letter-spacing="${letterSpacing}"
    fill="${purple}"
  >${title}</text>
  <rect
    x="${pillX}"
    y="${pillY}"
    width="${pillWidth}"
    height="${pillHeight}"
    rx="${pillHeight / 2}"
    fill="${yellow}"
  />
  <text
    x="${pillX + padX}"
    y="${pillY + padY + taglineSize * 0.85}"
    font-family="Segoe UI, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    font-size="${taglineSize}"
    font-weight="700"
    fill="${ink}"
  >${tagline}</text>
</svg>`;

const outPath = "public/studybuddyboard-logo.png";

await sharp(Buffer.from(svg))
  .png()
  .toFile(outPath);

console.log(`Wrote ${outPath} (${width}×${height}, transparent)`);
