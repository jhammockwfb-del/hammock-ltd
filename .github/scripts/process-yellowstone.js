const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const photoDir = path.join('photos', 'YellowStone NP');
const markerPath = path.join(photoDir, '.web-resize-complete');

async function processYellowstonePhotos() {
  if (fs.existsSync(markerPath)) {
    console.log('Yellowstone photos are already resized and renamed.');
    return;
  }

  const files = fs.readdirSync(photoDir)
    .filter(file => /\.(jpe?g)$/i.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (!files.length) throw new Error('No Yellowstone JPG files found.');

  const staged = [];
  for (let index = 0; index < files.length; index++) {
    const source = path.join(photoDir, files[index]);
    const temp = path.join(photoDir, `.yellowstone-source-${String(index + 1).padStart(3, '0')}.jpg`);
    fs.renameSync(source, temp);
    staged.push(temp);
  }

  for (let index = 0; index < staged.length; index++) {
    const number = String(index + 1).padStart(3, '0');
    const destination = path.join(photoDir, `Yellowstone_${number}.jpg`);
    const before = await sharp(staged[index]).metadata();

    await sharp(staged[index], { failOn: 'warning' })
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .withMetadata()
      .toFile(destination);

    const after = await sharp(destination).metadata();
    if ((before.orientation || 1) !== (after.orientation || 1)) {
      throw new Error(`Orientation changed for ${destination}`);
    }

    fs.unlinkSync(staged[index]);
    console.log(`Created ${path.basename(destination)} (${after.width}x${after.height}), orientation unchanged`);
  }

  fs.writeFileSync(markerPath, `Resized and renamed ${files.length} Yellowstone photos without changing orientation.\n`);
  console.log(`Yellowstone processing complete: ${files.length} files`);
}

processYellowstonePhotos().catch(error => {
  console.error(error);
  process.exit(1);
});
