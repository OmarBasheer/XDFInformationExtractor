#!/usr/bin/env node

// Simple script to create placeholder PNG icons from SVG
// Users can replace these with proper icons if needed

const fs = require('fs');
const path = require('path');

console.log('Note: This script creates placeholder icon files.');
console.log('For production use, please create proper PNG icons at:');
console.log('  - icons/icon16.png (16x16)');
console.log('  - icons/icon48.png (48x48)');
console.log('  - icons/icon128.png (128x128)');
console.log('\nYou can use the provided icon.svg as a reference.');

// Create minimal valid PNG files (1x1 transparent pixel)
// This is just to prevent extension loading errors
const minimalPNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach(size => {
  const filename = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filename, minimalPNG);
  console.log(`Created placeholder: icon${size}.png`);
});

console.log('\n✓ Placeholder icons created successfully!');
console.log('The extension will load, but please replace with proper icons for better appearance.');
