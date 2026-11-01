/*
 * Builds the data the website reads. Runs automatically on GitHub after
 * every push that touches photos/ or places.config.json.
 *
 *   1. Reads places.config.json (names, years, notes).
 *   2. Scans each photos/<folder>/ for pictures and videos.
 *   3. Makes a small preview copy of each picture in thumbs/<slug>/
 *      (about 640px wide) so the grids load fast. Originals are untouched.
 *   4. Writes places.json, which index.html and place.html read.
 *
 * Run locally with:  node .github/scripts/build-site-data.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = process.cwd();
const IMG = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const VID = new Set(['.mp4', '.mov', '.m4v']);
const THUMB_WIDTH = 640;

const naturalSort = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const url = p => p.split('/').map(encodeURIComponent).join('/');

async function makeThumb(src, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs) {
    const m = await sharp(dest).metadata();
    return { w: m.width, h: m.height, made: false };
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  // .rotate() with no argument applies the camera's EXIF orientation, so the
  // preview is stored upright and matches what browsers show for the original.
  const info = await sharp(src, { failOn: 'none' })
    .rotate()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 72, mozjpeg: true })
    .toFile(dest);
  return { w: info.width, h: info.height, made: true };
}

async function main() {
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'places.config.json'), 'utf8'));
  const out = { generated: new Date().toISOString(), places: [] };
  let made = 0, total = 0;

  for (const place of config.places) {
    const dir = path.join(ROOT, 'photos', place.folder);
    if (!fs.existsSync(dir)) { console.warn(`! folder missing: photos/${place.folder}`); continue; }

    const files = fs.readdirSync(dir).filter(f => !f.startsWith('.') && !f.endsWith('~')).sort(naturalSort);
    const photos = [], videos = [];

    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      const rel = `photos/${place.folder}/${f}`;
      if (IMG.has(ext)) {
        const thumbRel = `thumbs/${place.slug}/${path.parse(f).name}.jpg`;
        try {
          const t = await makeThumb(path.join(dir, f), path.join(ROOT, thumbRel));
          if (t.made) made++;
          const fav = (place.favorites || []).some(n => n.toLowerCase() === f.toLowerCase());
          photos.push(Object.assign({ src: url(rel), thumb: url(thumbRel), w: t.w, h: t.h }, fav ? { fav: true } : {}));
          total++;
        } catch (e) {
          console.warn(`! skipped ${rel}: ${e.message}`);
        }
      } else if (VID.has(ext)) {
        videos.push({ src: url(rel), type: ext === '.mov' ? 'video/quicktime' : 'video/mp4' });
      }
    }

    // Remove previews whose original was deleted.
    const thumbDir = path.join(ROOT, 'thumbs', place.slug);
    if (fs.existsSync(thumbDir)) {
      const keep = new Set(photos.map(p => decodeURIComponent(p.thumb).split('/').pop()));
      for (const t of fs.readdirSync(thumbDir)) if (!keep.has(t)) fs.unlinkSync(path.join(thumbDir, t));
    }

    const coverName = place.cover && path.parse(place.cover).name;
    const cover = photos.find(p => coverName && decodeURIComponent(p.thumb).endsWith(`/${coverName}.jpg`)) || photos[0];

    out.places.push({
      slug: place.slug,
      name: place.name,
      region: place.region || '',
      years: place.years || [],
      note: place.note || '',
      cover: cover ? cover.thumb : '',
      photos,
      videos,
    });
    console.log(`${place.name}: ${photos.length} photos, ${videos.length} videos`);
  }

  fs.writeFileSync(path.join(ROOT, 'places.json'), JSON.stringify(out));
  console.log(`Done. ${total} photos, ${made} new previews made.`);
}

main().catch(e => { console.error(e); process.exit(1); });
