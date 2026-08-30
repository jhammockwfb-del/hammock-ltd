/*
 * Build step for hammock.ltd
 * -------------------------------------------------
 * Cloudflare Pages runs `node build.js` on every push.
 * It scans the photos/ folder, builds photos.json, and
 * copies the site into dist/ (the published folder).
 *
 * You never edit this file to add photos. Just drop image
 * files into photos/ and (optionally) add a caption in
 * captions.json.
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "dist");
const PHOTOS_SRC = path.join(ROOT, "photos");

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

// --- reset dist/ ---
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// --- copy top-level site files ---
for (const name of ["index.html", "gallery.html", "styles.css", "_headers"]) {
  const src = path.join(ROOT, name);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT, name));
}

// --- copy photos/ into dist/photos/ ---
const outPhotos = path.join(OUT, "photos");
fs.mkdirSync(outPhotos, { recursive: true });

let files = [];
if (fs.existsSync(PHOTOS_SRC)) {
  files = fs.readdirSync(PHOTOS_SRC)
    .filter(f => IMAGE_EXT.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (const f of files) {
    fs.copyFileSync(path.join(PHOTOS_SRC, f), path.join(outPhotos, f));
  }
}

// --- optional captions map: { "venice.jpg": "Grand Canal, morning" } ---
let captions = {};
const capPath = path.join(ROOT, "captions.json");
if (fs.existsSync(capPath)) {
  try {
    captions = JSON.parse(fs.readFileSync(capPath, "utf8"));
  } catch (e) {
    console.warn("captions.json is not valid JSON, ignoring it:", e.message);
  }
}

// --- write manifest ---
const manifest = {
  generated: new Date().toISOString(),
  photos: files.map(file => ({ file, caption: captions[file] || "" })),
};
fs.writeFileSync(path.join(OUT, "photos.json"), JSON.stringify(manifest, null, 2));

console.log(`Built dist/ with ${files.length} photo(s).`);
