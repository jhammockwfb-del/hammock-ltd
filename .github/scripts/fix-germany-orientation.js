const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const countryPath = path.join('.', 'photos', 'germany');
const markerPath = path.join(countryPath, '.manual-orientation-fixed');

// Degrees are clockwise. This list was produced by visually inspecting the
// Germany gallery after EXIF-based auto-orientation reported no usable tags.
const rotations = {
  'germany_009.jpg': 270,
  'germany_014.jpg': 180,
  'germany_015.jpg': 180,
  'germany_018.jpg': 180,
  'germany_029.jpg': 180,
  'germany_030.jpg': 180,
  'germany_032.jpg': 180,
  'germany_035.jpg': 270,
  'germany_036.jpg': 270,
  'germany_038.jpg': 270,
  'germany_039.jpg': 270,
  'germany_040.jpg': 180,
  'germany_041.jpg': 270,
  'germany_042.jpg': 270,
  'germany_044.jpg': 270,
  'germany_045.jpg': 270,
  'germany_046.jpg': 180,
  'germany_047.jpg': 270,
  'germany_048.jpg': 270,
  'germany_049.jpg': 270,
  'germany_050.jpg': 270,
  'germany_051.jpg': 180,
  'germany_053.jpg': 270,
  'germany_054.jpg': 270,
  'germany_055.jpg': 180,
  'germany_056.jpg': 270,
  'germany_057.jpg': 270,
  'germany_058.jpg': 270,
  'germany_059.jpg': 270,
  'germany_060.jpg': 270,
  'germany_061.jpg': 270,
  'germany_062.jpg': 270,
  'germany_064.jpg': 90,
  'germany_065.jpg': 90,
  'germany_066.jpg': 90,
  'germany_067.jpg': 90,
  'germany_070.jpg': 90
};

async function fixGermanyOrientation() {
  if (fs.existsSync(markerPath)) {
    console.log('Manual Germany orientation correction already applied; nothing to do.');
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

  fs.writeFileSync(
    markerPath,
    `Applied explicit Germany orientation corrections to ${fixed} images.\n`
  );
  console.log(`Germany manual orientation correction complete: ${fixed} fixed`);
}

fixGermanyOrientation().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
