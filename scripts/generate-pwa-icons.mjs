import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../public/icons");
fs.mkdirSync(outDir, { recursive: true });

const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="512" height="512" rx="96" fill="#1E1F1B"/>
  <rect x="48" y="48" width="416" height="416" rx="72" fill="#6B7A3D"/>
  <text x="256" y="310" text-anchor="middle" font-family="Arial,sans-serif" font-size="220" font-weight="700" fill="#F8F7F2">N</text>
</svg>`);

await sharp(svg).png().toFile(path.join(outDir, "icon-source.png"));
await sharp(svg).resize(192, 192).png().toFile(path.join(outDir, "icon-192.png"));
await sharp(svg).resize(512, 512).png().toFile(path.join(outDir, "icon-512.png"));
await sharp(svg).resize(512, 512).png().toFile(path.join(outDir, "icon-maskable-512.png"));
await sharp(svg).resize(180, 180).png().toFile(path.join(outDir, "apple-touch-icon.png"));
await sharp(svg)
  .resize(1280, 720, {
    fit: "contain",
    background: { r: 30, g: 31, b: 27, alpha: 1 },
  })
  .png()
  .toFile(path.join(outDir, "splash-1280x720.png"));

console.log("PWA icons written to", outDir);
