import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets');
mkdirSync(outDir, { recursive: true });

const defs = `
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FAE9B4"/>
      <stop offset="0.42" stop-color="#E9BC52"/>
      <stop offset="1" stop-color="#B37C1E"/>
    </linearGradient>
    <linearGradient id="goldSoft" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFF3CE" stop-opacity="0.55"/>
      <stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="42%" r="62%">
      <stop offset="0" stop-color="#33270f"/>
      <stop offset="0.55" stop-color="#121008"/>
      <stop offset="1" stop-color="#07080a"/>
    </radialGradient>
  </defs>
`;

/** Gold rounded square with the AURUM ingot mark. size = square edge. */
function mark(x, y, size, rx) {
  const s = size / 32;
  return `
    <g transform="translate(${x} ${y}) scale(${s})">
      <rect width="32" height="32" rx="${rx / s}" fill="url(#gold)"/>
      <rect width="32" height="16" rx="${rx / s}" fill="url(#goldSoft)"/>
      <path d="M8.2 22.2l2.9-9.4h9.8l2.9 9.4H8.2z" fill="#0A0C0F"/>
      <path d="M12.3 12.8l1.4-2.5h4.6l1.4 2.5h-7.4z" fill="#0A0C0F" opacity="0.55"/>
      <path d="M10.4 19.3h11.2l-.6 1.9H11l-.6-1.9z" fill="url(#gold)" opacity="0.85"/>
    </g>`;
}

const iconOnly = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${defs}
  <rect width="1024" height="1024" fill="url(#glow)"/>
  ${mark(152, 152, 720, 176)}
</svg>`;

const iconForeground = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${defs}
  ${mark(212, 212, 600, 148)}
</svg>`;

const iconBackground = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${defs}
  <rect width="1024" height="1024" fill="url(#glow)"/>
</svg>`;

const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
  ${defs}
  <rect width="2732" height="2732" fill="#07080a"/>
  <circle cx="1366" cy="1230" r="900" fill="#E7B84B" opacity="0.05"/>
  <circle cx="1366" cy="1230" r="520" fill="#E7B84B" opacity="0.05"/>
  ${mark(1186, 986, 360, 88)}
  <text x="1366" y="1600" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="150" font-weight="600" letter-spacing="46" fill="#F2DCA2">AURUM</text>
  <text x="1366" y="1692" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="40" font-weight="500" letter-spacing="18" fill="#8C7644">GOLD CFD TERMINAL</text>
</svg>`;

const splashDark = splash;

const jobs = [
  ['icon-only.png', iconOnly],
  ['icon-foreground.png', iconForeground],
  ['icon-background.png', iconBackground],
  ['splash.png', splash],
  ['splash-dark.png', splashDark],
];

for (const [name, svg] of jobs) {
  await sharp(Buffer.from(svg)).png().toFile(join(outDir, name));
  console.log('wrote', name);
}
