// Builds the one-page identity sheet (A4 landscape, 300 dpi) as PNG and PDF.
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const B = require('./lib/node-brand');
const { coverArt } = require('./build-cover-thumbs');
const { OP, createCanvas, loadImage } = B;
const C = OP.C;

const OUT = path.join(__dirname, '..', 'deliverables', '01_identity');
const W = 3508, H = 2480, M = 130, GAP = 56;

async function main() {
  B.registerFonts();
  const logos = await B.loadLogos();
  const cv = createCanvas(W, H);
  const x = cv.getContext('2d');

  const text = (s, px, weight, color, tx, ty, align = 'left') => {
    x.font = OP.font(weight, px); x.fillStyle = color; x.textAlign = align; x.textBaseline = 'alphabetic';
    x.fillText(s, tx, ty); x.textAlign = 'left';
  };
  const lines = (arr, px, color, tx, ty, lh = 1.45, weight = 500) => arr.forEach((s, i) => text(s, px, weight, color, tx, ty + i * px * lh));
  const panel = (px, py, pw, ph, title, n) => {
    x.fillStyle = OP.rgba(C.blue, 0.42);
    OP.roundedRect(x, px, py, pw, ph, 18); x.fill();
    text(n, 26, 800, C.teal, px + 44, py + 70);
    text(title, 40, 700, C.lightMint, px + 96, py + 70);
    x.fillStyle = OP.rgba(C.lightBlue, 0.18);
    x.fillRect(px + 44, py + 100, pw - 88, 2);
  };

  // page
  x.fillStyle = C.slate; x.fillRect(0, 0, W, H);
  OP.drawLedgerField(x, 0, 0, W, H, 70, { strength: 0.12 });

  // header
  OP.drawFolio(x, M, 92, 150);
  text('Off Paper - Powered by Tokeniser', 78, 800, C.lightMint, M + 196, 168);
  text('Visual identity sheet  ·  colour, type, name, logo, graphic devices', 34, 500, C.mint, M + 198, 226);
  OP.drawLogo(x, logos.onDark.img, logos.onDark.box, W - M - 420, 120, 420 * logos.onDark.box.h / logos.onDark.box.w);

  const top = 300, colW = (W - 2 * M - 2 * GAP) / 3;
  const rowH = [640, 700, 640];
  const rowY = [top, top + rowH[0] + GAP, top + rowH[0] + rowH[1] + 2 * GAP];
  const colX = i => M + i * (colW + GAP);

  // ---------- 01 colour ----------
  {
    const px = colX(0), py = rowY[0], pw = colW * 2 + GAP, ph = rowH[0];
    panel(px, py, pw, ph, 'Colour', '01');
    const prim = [['Slate', C.slate, 'Ground. 60%'], ['Mint', C.mint, 'Signal + devices. 20%'], ['Light Mint', C.lightMint, 'Type + paper. 10%']];
    const sec = [['Light Blue', C.lightBlue, 'Text'], ['Blue', C.blue, 'Depth, light'], ['Teal', C.teal, 'Rules, links'], ['Orange', C.orange, 'Rare accent']];
    const sx = px + 44, sy = py + 140, bw = 430, bh = 250;
    prim.forEach(([n, hex, use], i) => {
      const bx = sx + i * (bw + 28);
      x.fillStyle = hex; OP.roundedRect(x, bx, sy, bw, bh, 14); x.fill();
      x.strokeStyle = OP.rgba(C.lightBlue, 0.35); x.lineWidth = 2; OP.roundedRect(x, bx, sy, bw, bh, 14); x.stroke();
      const ink = hex === C.slate ? C.lightMint : C.slate;
      text(n, 38, 700, ink, bx + 28, sy + 62);
      text(hex, 32, 500, ink, bx + 28, sy + bh - 64);
      text(use, 24, 500, ink, bx + 28, sy + bh - 26);
    });
    text('PRIMARY', 24, 800, C.teal, sx, sy - 14);
    const sy2 = sy + bh + 74, bw2 = 300, bh2 = 120;
    text('SECONDARY', 24, 800, C.teal, sx, sy2 - 14);
    sec.forEach(([n, hex, use], i) => {
      const bx = sx + i * (bw2 + 24);
      x.fillStyle = hex; OP.roundedRect(x, bx, sy2, bw2, bh2, 12); x.fill();
      const ink = (hex === C.blue || hex === C.teal) ? C.lightMint : C.slate;
      text(n, 30, 700, ink, bx + 22, sy2 + 48);
      text(hex + '  ·  ' + use, 21, 500, ink, bx + 22, sy2 + 92);
    });
    lines(['Tokeniser palette only. No tints from', 'outside it; transparency of a palette', 'colour over Slate is the only blend.', '', 'Text on Slate: Light Mint or Mint.', 'Text on Light Mint: Slate or Teal.'], 26, C.lightBlue, sx + 3 * (bw + 28) - 10 + 36 - 30, sy + 36);
  }

  // ---------- 02 type ----------
  {
    const px = colX(2), py = rowY[0], pw = colW, ph = rowH[0];
    panel(px, py, pw, ph, 'Typeface: Montserrat', '02');
    const tx = px + 44;
    text('Aa', 190, 800, C.lightMint, tx - 6, py + 320);
    text('ExtraBold 800', 28, 800, C.mint, tx + 300, py + 200);
    text('Show name, titles', 24, 500, C.lightBlue, tx + 300, py + 236);
    text('Bold 700', 28, 700, C.mint, tx + 300, py + 288);
    text('Guest names, headings', 24, 500, C.lightBlue, tx + 300, py + 324);
    text('Medium 500', 28, 500, C.mint, tx + 640, py + 200);
    text('Name tail, body, roles', 24, 500, C.lightBlue, tx + 640, py + 236);
    text('Regular 400', 28, 400, C.mint, tx + 640, py + 288);
    text('Long-form copy', 24, 500, C.lightBlue, tx + 640, py + 324);
    text('The AUDD Stablecoin Story', 52, 800, C.lightMint, tx, py + 430);
    text('Effie Dimitropoulos', 38, 700, C.mint, tx, py + 490);
    text('AUDD Stablecoin', 30, 500, C.lightBlue, tx, py + 536);
    text('Sentence case. Tight tracking (-2%) on display sizes only.', 22, 500, C.lightBlue, tx, py + 600);
  }

  // ---------- 03 name ----------
  {
    const px = colX(0), py = rowY[1], pw = colW, ph = rowH[1];
    panel(px, py, pw, ph, 'Show name', '03');
    const tx = px + 44;
    // stacked on slate
    x.fillStyle = C.slate; OP.roundedRect(x, tx, py + 130, pw - 88, 240, 12); x.fill();
    OP.drawFolio(x, tx + 34, py + 175, 150);
    OP.drawNameStacked(x, tx + 214, py + 262, 96);
    // inline on light mint
    x.fillStyle = C.lightMint; OP.roundedRect(x, tx, py + 392, pw - 88, 112, 12); x.fill();
    OP.drawNameInline(x, tx + 36, py + 462, 38, { head: C.slate, tail: C.teal });
    lines(['Always exactly: "Off Paper - Powered by Tokeniser".', 'Stacked: line break after "Paper"; the hyphen', 'leads line two. Inline: one line, one space each', 'side of the hyphen. Never abbreviated, never', 'reworded, never "Off-Paper" or "OffPaper".'], 22, C.lightBlue, tx, py + 552, 1.38);
  }

  // ---------- 04 logo ----------
  {
    const px = colX(1), py = rowY[1], pw = colW, ph = rowH[1];
    panel(px, py, pw, ph, 'Tokeniser logo', '04');
    const tx = px + 44, bw = pw - 88;
    // on dark with clear space
    x.fillStyle = C.slate; OP.roundedRect(x, tx, py + 130, bw, 230, 12); x.fill();
    const lh = 92, lw = logos.onDark.box.w * lh / logos.onDark.box.h;
    const lx = tx + (bw - lw) / 2, ly = py + 130 + (230 - lh) / 2;
    x.save(); x.setLineDash([10, 8]); x.strokeStyle = OP.rgba(C.orange, 0.9); x.lineWidth = 2;
    x.strokeRect(lx - lh / 2, ly - lh / 2, lw + lh, lh * 2); x.restore();
    OP.drawLogo(x, logos.onDark.img, logos.onDark.box, lx, ly, lh);
    text('x = ½ logo height clear space', 20, 700, C.orange, lx - lh / 2, ly - lh / 2 - 10);
    // on light
    x.fillStyle = C.lightMint; OP.roundedRect(x, tx, py + 382, (bw - 24) / 2, 140, 12); x.fill();
    const lh2 = 46, lw2 = logos.onLight.box.w * lh2 / logos.onLight.box.h;
    OP.drawLogo(x, logos.onLight.img, logos.onLight.box, tx + ((bw - 24) / 2 - lw2) / 2, py + 382 + 47, lh2);
    // on mint (square file, used whole)
    const sq = 140;
    x.drawImage(logos.onMint.img, tx + (bw + 24) / 2, py + 382, sq, sq);
    lines(['On-mint', 'square file,', 'used whole'], 20, C.lightBlue, tx + (bw + 24) / 2 + sq + 20, py + 410, 1.3);
    lines(['Use the three supplied PNGs only: on-dark (Slate', 'and photos), slate-green (Light Mint), on-mint', '(square). Scale proportionally. Never redraw,', 'recolour, outline, shadow, rotate or stretch.', 'Minimum size: 24 px / 6 mm logo height.'], 22, C.lightBlue, tx, py + 560, 1.38);
  }

  // ---------- 05 devices + opacity rules ----------
  {
    const px = colX(2), py = rowY[1], pw = colW, ph = rowH[1];
    panel(px, py, pw, ph, 'Graphic devices', '05');
    const tx = px + 44;
    const cell = (pw - 88 - 3 * 24) / 4;
    const items = ['Folio mark', 'Ledger field', 'Chain link', 'Tile cascade'];
    items.forEach((n, i) => {
      const bx = tx + i * (cell + 24), by = py + 130;
      x.fillStyle = C.slate; OP.roundedRect(x, bx, by, cell, cell, 10); x.fill();
      x.save(); x.beginPath(); x.rect(bx, by, cell, cell); x.clip();
      if (i === 0) OP.drawFolio(x, bx + cell * 0.18, by + cell * 0.18, cell * 0.64);
      if (i === 1) OP.drawLedgerField(x, bx, by, cell, cell, 22, { strength: 0.9, radius: 2.6 });
      if (i === 2) OP.drawChainLink(x, bx + 20, by + cell / 2, bx + cell - 20, by + cell / 2, { color: C.teal, nodeColor: C.mint, width: 3, nodes: 3 });
      if (i === 3) OP.drawCascade(x, bx + 10, by + 14, 26, 7, 7, {});
      x.restore();
      text(n, 21, 700, C.mint, bx, by + cell + 34);
    });
    // opacity rules demo: solid vs photo
    const oy = py + 130 + cell + 70, ow = (pw - 88 - 24) / 2, oh = 190;
    x.fillStyle = C.slate; OP.roundedRect(x, tx, oy, ow, oh, 10); x.fill();
    OP.drawFolio(x, tx + 24, oy + 30, 130, { alpha: 0.7 });
    lines(['On solid colour', 'devices at 70%'], 22, C.lightMint, tx + 180, oy + 80, 1.35, 700);
    const ph2 = B.makePortrait(600, 400, 1);
    x.save(); OP.roundedRect(x, tx + ow + 24, oy, ow, oh, 10); x.clip();
    OP.drawCover(x, ph2, tx + ow + 24, oy, ow, oh);
    x.fillStyle = OP.rgba(C.slate, 0.3); x.fillRect(tx + ow + 24, oy, ow, oh);
    OP.drawFolio(x, tx + ow + 48, oy + 30, 130, { alpha: 0.6 });
    x.restore();
    lines(['On photos: 30% Slate', 'overlay, devices 60%'], 22, C.lightMint, tx + ow + 204, oy + 80, 1.35, 700);
    lines(['The Folio mark is a sheet already turned into', 'units; its top corner lifts off the page.'], 22, C.lightBlue, tx, oy + oh + 50, 1.42);
  }

  // ---------- 06 applications ----------
  {
    const px = colX(0), py = rowY[2], pw = W - 2 * M, ph = rowH[2];
    panel(px, py, pw, ph, 'Applications: one show, one system', '06');
    const ay = py + 140, ah = ph - 200;
    const cover = coverArt(ah, logos);
    x.drawImage(cover, px + 44, ay, ah, ah);
    text('Cover 3000 x 3000', 22, 700, C.mint, px + 44, ay + ah + 36);
    const thumbP = path.join(__dirname, '..', 'deliverables', '03_thumbnails', 'examples', 'offpaper-thumb-ep29.png');
    const th = await loadImage(fs.readFileSync(thumbP));
    const tw = ah * 16 / 9;
    x.drawImage(th, px + 44 + ah + 40, ay, tw, ah);
    text('Episode thumbnail 16:9', 22, 700, C.mint, px + 44 + ah + 40, ay + ah + 36);
    const stillL = path.join(__dirname, 'build', 'stills', 'landscape', 't15.0.png');
    const stillV = path.join(__dirname, 'build', 'stills', 'vertical', 't15.0.png');
    let vx = px + 44 + ah + 40 + tw + 40;
    if (fs.existsSync(stillL)) {
      const s1 = await loadImage(fs.readFileSync(stillL));
      const w1 = Math.min(ah * 16 / 9, pw - (vx - px) - 44 - 40 - ah * 9 / 16);
      x.drawImage(s1, vx, ay + (ah - w1 * 9 / 16) / 2, w1, w1 * 9 / 16);
      text('Opening, 16:9 end frame', 22, 700, C.mint, vx, ay + ah + 36);
      vx += w1 + 40;
    }
    if (fs.existsSync(stillV)) {
      const s2 = await loadImage(fs.readFileSync(stillV));
      x.drawImage(s2, vx, ay, ah * 9 / 16, ah);
      text('9:16', 22, 700, C.mint, vx, ay + ah + 36);
    }
  }

  fs.mkdirSync(OUT, { recursive: true });
  const png = cv.toBuffer('image/png');
  fs.writeFileSync(path.join(OUT, 'offpaper-identity-sheet.png'), png);
  const pdf = await PDFDocument.create();
  pdf.setTitle('Off Paper - Powered by Tokeniser: Visual identity sheet');
  pdf.setSubject('Colours, typeface, show name, logo use and graphic devices');
  pdf.setCreator('Off Paper identity build');
  const page = pdf.addPage([841.89, 595.28]);
  const img = await pdf.embedPng(png);
  page.drawImage(img, { x: 0, y: 0, width: 841.89, height: 595.28 });
  fs.writeFileSync(path.join(OUT, 'offpaper-identity-sheet.pdf'), await pdf.save());
  console.log('identity sheet done');
}

main().catch(e => { console.error(e); process.exit(1); });
