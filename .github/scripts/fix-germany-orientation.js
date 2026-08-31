const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const countryPath = path.join('.', 'photos', 'germany');
const markerPath = path.join(countryPath, '.manual-orientation-fixed-v2');

// Follow-up corrections after visually verifying the first published pass.
// Degrees are clockwise relative to the currently published files.
const rotations = {
  'germany_035.jpg': 180,
  'germany_036.jpg': 180,
  'germany_038.jpg': 180,
  'germany_039.jpg': 180,
  'germany_041.jpg': 180,
  'germany_042.jpg': 180,
  'germany_044.jpg': 180,
  'germany_045.jpg': 180,
  'germany_047.jpg': 180,
  'germany_048.jpg': 180,
  'germany_049.jpg': 180,
  'germany_050.jpg': 180,
  'germany_053.jpg': 180,
  'germany_054.jpg': 180,
  'germany_056.jpg': 180,
  'germany_057.jpg': 180,
  'germany_067.jpg': 90
};

async function fixGermanyOrientation() {
  if (fs.existsSync(markerPath)) {
    console.log('Germany orientation correction v2 already applied; nothing to do.');
    return;
  }

  let fixed = 0;
  for (const [file, degrees] of Object.entries(rotations)) {
    const filePath = path.join(countryPath, file);
    const ext = path.extname(file);
    const tempPath = path.join(countryPath, `.${file}.rotated${ext}`);

    try {
      if (!fs.existsSync(filePath)) throw new Error('file not found');
      await sharp(filePath).rotate(degrees).toFile(tempPath);
      fs.renameSync(tempPath, filePath);
      fixed++;
      console.log(`Rotated ${file} ${degrees} degrees clockwise`);
    } catch (err) {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      throw new Error(`Failed to rotate ${file}: ${err.message}`);
    }
  }

  fs.writeFileSync(markerPath, `Applied Germany orientation corrections v2 to ${fixed} images.\n`);
  console.log(`Germany orientation correction v2 complete: ${fixed} fixed`);
}

fixGermanyOrientation().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
