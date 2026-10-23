// Node-only helpers: font registration, logo loading, grain, placeholder portraits.
const path = require('path');
const fs = require('fs');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const OP = require('./offpaper-draw');

const ASSETS = path.join(__dirname, '..', 'assets');
const LOGO_FILES = {
  onDark: 'tokeniser-logo-on-dark.png',
  onLight: 'tokeniser-logo-slate-green-icon.png',
  onMint: 'tokeniser-logo-on-mint.png'
};
const WEIGHTS = ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold'];

let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  for (const w of WEIGHTS) {
    const ok = GlobalFonts.registerFromPath(path.join(ASSETS, `Montserrat-${w}.ttf`), 'Montserrat');
    if (!ok) throw new Error(`Could not register Montserrat-${w}`);
  }
  fontsReady = true;
}

// Bounding box of non-transparent pixels, so layout aligns to the artwork
// rather than to the padding baked into the supplied PNG.
function alphaBox(img, threshold = 8) {
  const c = createCanvas(img.width, img.height);
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, img.width, img.height).data;
  let minX = img.width, minY = img.height, maxX = -1, maxY = -1;
  for (let y = 0; y < img.height; y++) {
    for (let xx = 0; xx < img.width; xx++) {
      if (d[(y * img.width + xx) * 4 + 3] > threshold) {
        if (xx < minX) minX = xx;
        if (xx > maxX) maxX = xx;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

async function loadLogos() {
  const out = {};
  for (const [k, f] of Object.entries(LOGO_FILES)) {
    const file = path.join(ASSETS, f);
    const img = await loadImage(fs.readFileSync(file));
    out[k] = { img, box: k === 'onMint' ? { x: 0, y: 0, w: img.width, h: img.height } : alphaBox(img), file };
  }
  return out;
}

// Film grain built only from palette colours (Light Mint / Slate specks).
function makeGrain(size, seed = 7, density = 0.5) {
  const c = createCanvas(size, size);
  const x = c.getContext('2d');
  const img = x.createImageData(size, size);
  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const lm = [0xda, 0xfd, 0xe5], sl = [0x34, 0x37, 0x40];
  for (let i = 0; i < size * size; i++) {
    const r = rnd();
    if (r > density) continue;
    const light = rnd() > 0.5;
    const col = light ? lm : sl;
    img.data[i * 4] = col[0];
    img.data[i * 4 + 1] = col[1];
    img.data[i * 4 + 2] = col[2];
    img.data[i * 4 + 3] = Math.floor(rnd() * 26);
  }
  x.putImageData(img, 0, 0);
  return c;
}

/*
 * Licence-safe placeholder portrait (made here, not stock). Stands in for a
 * guest-supplied headshot in the example thumbnails. A studio-lit
 * silhouette on a backdrop, built only from palette colours.
 */
function makePortrait(w, h, variant = 0) {
  const C = OP.C;
  const c = createCanvas(w, h);
  const x = c.getContext('2d');
  const looks = [
    { bg1: C.blue, bg2: C.slate, rim: C.lightBlue, key: C.teal, shift: 0.0 },
    { bg1: C.teal, bg2: C.blue, rim: C.lightMint, key: C.mint, shift: 0.06 },
    { bg1: C.slate, bg2: C.blue, rim: C.orange, key: C.lightBlue, shift: -0.05 },
    { bg1: C.blue, bg2: C.teal, rim: C.lightMint, key: C.lightBlue, shift: 0.03 }
  ];
  const L = looks[variant % looks.length];
  // backdrop with soft key light
  const g = x.createRadialGradient(w * 0.62, h * 0.32, 10, w * 0.5, h * 0.5, Math.max(w, h) * 0.85);
  g.addColorStop(0, L.bg1);
  g.addColorStop(1, L.bg2);
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  const glow = x.createRadialGradient(w * 0.7, h * 0.25, 0, w * 0.7, h * 0.25, w * 0.6);
  glow.addColorStop(0, OP.rgba(L.key, 0.35));
  glow.addColorStop(1, OP.rgba(L.key, 0));
  x.fillStyle = glow;
  x.fillRect(0, 0, w, h);

  const cx = w * (0.52 + L.shift), headY = h * 0.38, hr = Math.min(w, h) * 0.17;
  const figure = () => {
    x.beginPath();
    // head
    x.ellipse(cx, headY, hr * 0.86, hr * 1.08, 0, 0, Math.PI * 2);
    // neck + shoulders
    x.moveTo(cx - hr * 0.42, headY + hr * 0.8);
    x.lineTo(cx + hr * 0.42, headY + hr * 0.8);
    x.lineTo(cx + hr * 0.5, headY + hr * 1.55);
    x.bezierCurveTo(cx + hr * 2.2, headY + hr * 1.75, cx + hr * 2.9, headY + hr * 2.3, cx + hr * 3.2, h + 10);
    x.lineTo(cx - hr * 3.2, h + 10);
    x.bezierCurveTo(cx - hr * 2.9, headY + hr * 2.3, cx - hr * 2.2, headY + hr * 1.75, cx - hr * 0.5, headY + hr * 1.55);
    x.closePath();
  };
  // rim light: offset copy behind the figure
  x.save();
  x.translate(hr * 0.06, -hr * 0.04);
  figure();
  x.fillStyle = OP.rgba(L.rim, 0.85);
  x.shadowColor = OP.rgba(L.rim, 0.6);
  x.shadowBlur = hr * 0.9;
  x.fill();
  x.restore();
  // body
  figure();
  const bg = x.createLinearGradient(0, headY - hr, 0, h);
  bg.addColorStop(0, C.slate);
  bg.addColorStop(1, OP.mixHex(C.slate, C.blue, 0.35));
  x.fillStyle = bg;
  x.fill();
  // key light falling across the figure from the right
  figure();
  x.save();
  x.clip();
  const kl = x.createLinearGradient(cx - hr * 2, 0, cx + hr * 2.5, 0);
  kl.addColorStop(0, OP.rgba(L.key, 0));
  kl.addColorStop(1, OP.rgba(L.key, 0.22));
  x.fillStyle = kl;
  x.fillRect(0, 0, w, h);
  x.restore();
  // grain so it reads as a photograph
  x.drawImage(makeGrain(512, 11 + variant, 0.9), 0, 0, w, h);
  return c;
}

function savePNG(canvas, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, canvas.toBuffer('image/png'));
}

module.exports = { OP, ASSETS, LOGO_FILES, registerFonts, loadLogos, alphaBox, makeGrain, makePortrait, savePNG, createCanvas, loadImage };
