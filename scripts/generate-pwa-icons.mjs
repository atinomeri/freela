#!/usr/bin/env node
/**
 * Generate PWA icons from mark.svg
 * Run: node scripts/generate-pwa-icons.mjs
 */

import sharp from 'sharp';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Icon configurations
const icons = [
  { name: 'icon-192x192.png', size: 192, maskable: false },
  { name: 'icon-192x192-maskable.png', size: 192, maskable: true },
  { name: 'icon-512x512.png', size: 512, maskable: false },
  { name: 'icon-512x512-maskable.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
  { name: 'favicon-32x32.png', size: 32, maskable: false },
  { name: 'favicon-16x16.png', size: 16, maskable: false },
];

// Colors from the design
const PRIMARY_COLOR = '#5c6cf9';
const BACKGROUND_COLOR = '#0b0f14';

// SVG with the F logo
const createSvg = (size, maskable = false) => {
  const padding = maskable ? size * 0.1 : 0; // 10% safe zone for maskable
  const innerSize = size - padding * 2;
  const rx = Math.round(innerSize * 0.22); // Rounded corners
  
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="${maskable ? PRIMARY_COLOR : 'transparent'}" />
    <rect x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" rx="${rx}" fill="${PRIMARY_COLOR}" />
    <path d="${scalePath(padding, innerSize)}" fill="white" />
  </svg>`;
};

// Scale the F path from original 64x64 to target size
function scalePath(padding, size) {
  const scale = size / 64;
  const ox = padding; // offset x
  const oy = padding; // offset y
  
  // Original path: M22 44V20H41.5V26H29V30H39V36H29V44H22Z
  const points = [
    [22, 44], [22, 20], [41.5, 20], [41.5, 26],
    [29, 26], [29, 30], [39, 30], [39, 36],
    [29, 36], [29, 44], [22, 44]
  ];
  
  const scaled = points.map(([x, y]) => [
    Math.round((x * scale + ox) * 100) / 100,
    Math.round((y * scale + oy) * 100) / 100
  ]);
  
  return `M${scaled[0].join(' ')}V${scaled[1][1]}H${scaled[2][0]}V${scaled[3][1]}H${scaled[4][0]}V${scaled[5][1]}H${scaled[6][0]}V${scaled[7][1]}H${scaled[8][0]}V${scaled[9][1]}H${scaled[10][0]}Z`;
}

async function generateIcons() {
  const outputDir = join(rootDir, 'public', 'icons');
  
  // Ensure directory exists
  await mkdir(outputDir, { recursive: true });
  
  console.log('Generating PWA icons...\n');
  
  for (const icon of icons) {
    const svg = createSvg(icon.size, icon.maskable);
    const outputPath = join(outputDir, icon.name);
    
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);
    
    console.log(`✓ ${icon.name} (${icon.size}x${icon.size})`);
  }
  
  // Generate Safari pinned tab SVG (monochrome)
  const safariSvg = `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="64" rx="14" fill="black" />
    <path d="M22 44V20H41.5V26H29V30H39V36H29V44H22Z" fill="white" />
  </svg>`;
  
  await writeFile(join(outputDir, 'safari-pinned-tab.svg'), safariSvg);
  console.log('✓ safari-pinned-tab.svg');
  
  console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch(console.error);
