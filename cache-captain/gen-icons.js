// Run with: node gen-icons.js
// Uses sharp to render an SVG (with the real FA arrows-rotate path) to PNG at each size.
const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const SIZES = [16, 32, 48, 96, 128];

// Font Awesome 6 Free solid "arrows-rotate" path (CC BY 4.0)
// viewBox 0 0 512 512
const FA_REFRESH = "M463.5 224H472c13.3 0 24-10.7 24-24V72c0-9.7-5.8-18.5-14.8-22.2s-19.3-1.7-26.2 5.2L413.4 96.6c-87.6-86.5-228.7-86.2-315.8 1c-87.5 87.5-87.5 229.3 0 316.8s229.3 87.5 316.8 0c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0c-62.5 62.5-163.8 62.5-226.3 0s-62.5-163.8 0-226.3c62.2-62.2 162.7-62.5 225.3-1L327 183c-6.9 6.9-8.9 17.2-5.2 26.2s12.5 14.8 22.2 14.8H463.5z";

function makeSvg(size) {
  const pad = Math.round(size * 0.18);   // padding inside the box
  const iconSize = size - pad * 2;
  const r = Math.round(size * 0.18);     // corner radius
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#1a2744"/>
  <g transform="translate(${pad},${pad}) scale(${iconSize/512})">
    <path d="${FA_REFRESH}" fill="white"/>
  </g>
</svg>`;
}

(async () => {
  const outDir = path.join(__dirname, 'icons');
  for (const size of SIZES) {
    const svg  = makeSvg(size);
    const file = path.join(outDir, `icon-${size}.png`);
    await sharp(Buffer.from(svg)).png().toFile(file);
    console.log(`Generated icon-${size}.png`);
  }
  console.log('Done.');
})();
