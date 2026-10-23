// Builds: show cover art (3000 + 1400) and the example episode thumbnails.
const path = require('path');
const fs = require('fs');
const B = require('./lib/node-brand');
const { OP, createCanvas } = B;
const C = OP.C;

const OUT = path.join(__dirname, '..', 'deliverables');

function coverArt(size, logos) {
  const k = size / 3000;
  const cv = createCanvas(size, size);
  const x = cv.getContext('2d');
  x.scale(k, k);
  const S = 3000;

  x.fillStyle = C.slate;
  x.fillRect(0, 0, S, S);
  const glow = x.createRadialGradient(2250, 760, 80, 2250, 760, 2100);
  glow.addColorStop(0, OP.rgba(C.blue, 0.95));
  glow.addColorStop(1, OP.rgba(C.blue, 0));
  x.fillStyle = glow;
  x.fillRect(0, 0, S, S);
  OP.drawLedgerField(x, 0, 0, S, S, 100, { strength: 0.2 });

  // Folio mark, oversized, with tiles carrying on off the corner
  const fx = 1440, fy = 360, fs_ = 1260;
  // hairline of the original sheet, folded at the corner the tiles leave from
  x.save();
  x.globalAlpha = OP.RULES.deviceOnSolid * 0.6;
  x.strokeStyle = C.lightBlue;
  x.lineWidth = 4;
  const m = 46, fold = fs_ * 0.42;
  x.beginPath();
  x.moveTo(fx - m, fy - m);
  x.lineTo(fx + fs_ + m - fold, fy - m);
  x.lineTo(fx + fs_ + m, fy - m + fold);
  x.lineTo(fx + fs_ + m, fy + fs_ + m);
  x.lineTo(fx - m, fy + fs_ + m);
  x.closePath();
  x.stroke();
  x.setLineDash([14, 14]);
  x.beginPath();
  x.moveTo(fx + fs_ + m - fold, fy - m);
  x.lineTo(fx + fs_ + m - fold, fy - m + fold);
  x.lineTo(fx + fs_ + m, fy - m + fold);
  x.stroke();
  x.restore();
  OP.drawFolio(x, fx, fy, fs_);
  const pitch = fs_ / 6, tile = pitch * 0.82;
  const drift = [[6.2, -0.9, 0.7], [6.9, -1.9, 0.5], [7.4, -0.5, 0.42], [6.0, -2.6, 0.34], [7.9, -1.6, 0.26]];
  x.save();
  drift.forEach(([c, r, sc], i) => {
    x.globalAlpha = OP.RULES.deviceOnSolid * (1 - i * 0.12);
    x.fillStyle = i % 2 ? C.mint : C.lightMint;
    const s = tile * sc;
    OP.roundedRect(x, fx + c * pitch, fy + r * pitch, s, s, s * 0.12);
    x.fill();
  });
  x.restore();

  // Name lockup
  OP.drawNameStacked(x, 222, 2060, 440);

  // Chain link rule + Tokeniser logo
  OP.drawChainLink(x, 240, 2448, 2760, 2448, { color: C.teal, width: 5, nodes: 6 });
  B.OP.drawLogo(x, logos.onDark.img, logos.onDark.box, 240, 2590, 150);
  return cv;
}

async function main() {
  B.registerFonts();
  const logos = await B.loadLogos();
  const eps = JSON.parse(fs.readFileSync(path.join(__dirname, 'episodes.json'), 'utf8'));

  const coverDir = path.join(OUT, '02_cover-art');
  B.savePNG(coverArt(3000, logos), path.join(coverDir, 'offpaper-cover-3000.png'));
  const c1400 = coverArt(1400, logos);
  fs.writeFileSync(path.join(coverDir, 'offpaper-cover-1400.jpg'), c1400.toBuffer('image/jpeg', 95));

  const thumbDir = path.join(OUT, '03_thumbnails');
  const photoDir = path.join(thumbDir, 'placeholder-photos');
  const all = [...eps.examples, eps.stressTest];
  for (const e of all) {
    const portrait = B.makePortrait(1200, 1350, e.portrait);
    B.savePNG(portrait, path.join(photoDir, `placeholder-portrait-${e.portrait + 1}.png`));
    for (const [w, h, suffix] of [[1920, 1080, ''], [1280, 720, '-1280']]) {
      const cv = createCanvas(w, h);
      OP.drawThumbnail(cv.getContext('2d'), e, { logo: logos.onDark.img, logoBox: logos.onDark.box, photo: portrait }, w / 1920);
      const sub = e === eps.stressTest ? 'extra-long-title-test' : 'examples';
      B.savePNG(cv, path.join(thumbDir, sub, `${e.file}${suffix}.png`));
    }
  }
  // phone-size proof: what a viewer actually sees in a feed (~360 px wide)
  for (const e of eps.examples) {
    const cv = createCanvas(360, 203);
    const portrait = B.makePortrait(1200, 1350, e.portrait);
    OP.drawThumbnail(cv.getContext('2d'), e, { logo: logos.onDark.img, logoBox: logos.onDark.box, photo: portrait }, 360 / 1920);
    B.savePNG(cv, path.join(thumbDir, 'phone-size-proof', `${e.file}-360px.png`));
  }
  fs.writeFileSync(path.join(__dirname, 'build', 'logo-boxes.json'),
    JSON.stringify(Object.fromEntries(Object.entries(logos).map(([k, v]) => [k, v.box])), null, 2));
  console.log('cover + thumbnails done');
}

if (require.main === module) {
  fs.mkdirSync(path.join(__dirname, 'build'), { recursive: true });
  main().catch(e => { console.error(e); process.exit(1); });
}
module.exports = { coverArt };
