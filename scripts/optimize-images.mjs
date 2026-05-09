import sharp from "sharp";
import { mkdirSync } from "fs";

const INPUT_DIR = "Project Data";
const OUTPUT_DIR = "public";

mkdirSync(`${OUTPUT_DIR}/images`, { recursive: true });

// Favicon - create multiple sizes
const faviconSrc = `${INPUT_DIR}/KnotBook Favicon.png`;

await sharp(faviconSrc).resize(32, 32).png().toFile(`${OUTPUT_DIR}/favicon-32.png`);
await sharp(faviconSrc).resize(16, 16).png().toFile(`${OUTPUT_DIR}/favicon-16.png`);
await sharp(faviconSrc).resize(180, 180).png().toFile(`${OUTPUT_DIR}/apple-touch-icon.png`);
await sharp(faviconSrc).resize(192, 192).png().toFile(`${OUTPUT_DIR}/icon-192.png`);
await sharp(faviconSrc).resize(512, 512).png().toFile(`${OUTPUT_DIR}/icon-512.png`);
await sharp(faviconSrc).resize(32, 32).toFile(`${OUTPUT_DIR}/favicon.ico`);

// Logo - optimized versions
const logoSrc = `${INPUT_DIR}/KnotBook Logo.png`;
await sharp(logoSrc).resize(200, null, { withoutEnlargement: true }).png({ quality: 90 }).toFile(`${OUTPUT_DIR}/images/knotbook-logo.png`);
await sharp(logoSrc).resize(400, null, { withoutEnlargement: true }).png({ quality: 90 }).toFile(`${OUTPUT_DIR}/images/knotbook-logo-2x.png`);

// Logo mark (the emblem only) - use the favicon source which is just the knot icon
await sharp(faviconSrc).resize(80, 80).png({ quality: 90 }).toFile(`${OUTPUT_DIR}/images/knotbook-mark.png`);
await sharp(faviconSrc).resize(48, 48).png({ quality: 90 }).toFile(`${OUTPUT_DIR}/images/knotbook-mark-sm.png`);

// Hero image for landing page - the emblem on linen bg
const heroIconSrc = `${INPUT_DIR}/16C02BB0-694D-4208-9571-83FB73737604.jpeg`;
await sharp(heroIconSrc).resize(600, null, { withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(`${OUTPUT_DIR}/images/knotbook-emblem.jpg`);

// Open Graph image - logo on dark bg for social sharing
await sharp(logoSrc).resize(1200, 630, { fit: "contain", background: { r: 28, g: 28, b: 24 } }).png({ quality: 90 }).toFile(`${OUTPUT_DIR}/og-image.png`);

console.log("All images optimized!");
