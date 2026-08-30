const fs = require('fs');
const path = require('path');

// Read the photos directory
const photosDir = './photos';

// Get all country subdirectories
const countries = fs.readdirSync(photosDir).filter(file => {
  const fullPath = path.join(photosDir, file);
  return fs.statSync(fullPath).isDirectory();
});

console.log(`Found ${countries.length} country folders`);

// For each country, generate JSON
countries.forEach(country => {
  const countryPath = path.join(photosDir, country);

  // Get all image files (jpg, jpeg, png, gif)
  const files = fs.readdirSync(countryPath)
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
    })
    .sort((a, b) => {
      // Sort by number in filename
      const numA = parseInt(a.match(/\d+/)?.[0] || 0);
      const numB = parseInt(b.match(/\d+/)?.[0] || 0);
      return numA - numB;
    });

  if (files.length === 0) {
    console.log(`⚠️  No images found in ${country}`);
    return;
  }

  // Create gallery array with full paths
  const gallery = files.map(file => `photos/${country}/${file}`);

  // Featured image is the first one
  const featured = gallery[0];

  // Create JSON object
  const jsonData = {
    featured: featured,
    gallery: gallery
  };

  // Write JSON file to root directory
  const jsonFilePath = path.join(`./${country}-photos.json`);
  fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2));

  console.log(`✅ Generated ${country}-photos.json (${files.length} images)`);
});

console.log('✨ Photo gallery JSON generation complete!');
