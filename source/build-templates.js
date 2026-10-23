// Builds the editable thumbnail templates:
//   1. thumbnail-maker.html  - self-contained browser tool (free, offline)
//   2. offpaper-thumbnail-template.svg - layered file for Figma / Penpot / Inkscape
const path = require('path');
const fs = require('fs');
const B = require('./lib/node-brand');
const { OP } = B;
const C = OP.C;

const OUT = path.join(__dirname, '..', 'deliverables', '03_thumbnails', 'editable-template');

const b64 = f => fs.readFileSync(f).toString('base64');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function main() {
  B.registerFonts();
  const logos = await B.loadLogos();
  fs.mkdirSync(OUT, { recursive: true });

  const portrait = B.makePortrait(1200, 1350, 0);
  const photoJpg = portrait.toBuffer('image/jpeg', 88);
  const photoSrc = 'data:image/jpeg;base64,' + photoJpg.toString('base64');
  const logoSrc = 'data:image/png;base64,' + b64(logos.onDark.file);

  // ---- 1. HTML maker
  let html = fs.readFileSync(path.join(__dirname, 'templates', 'thumbnail-maker.template.html'), 'utf8');
  const fontURI = w => 'data:font/ttf;base64,' + b64(path.join(B.ASSETS, `Montserrat-${w}.ttf`));
  html = html
    .replace('__FONT_500__', fontURI('Medium'))
    .replace('__FONT_700__', fontURI('Bold'))
    .replace('__FONT_800__', fontURI('ExtraBold'))
    .replace('__OFFPAPER_DRAW__', () => fs.readFileSync(path.join(__dirname, 'lib', 'offpaper-draw.js'), 'utf8'))
    .replace('__LOGO_BOX__', JSON.stringify(logos.onDark.box))
    .replace('__LOGO_SRC__', logoSrc)
    .replace('__PHOTO_SRC__', photoSrc);
  fs.writeFileSync(path.join(OUT, 'offpaper-thumbnail-maker.html'), html);

  // ---- 2. Layered SVG mirroring OP.drawThumbnail geometry
  const { W, H, margin: M, photoX: PX } = OP.THUMB;
  const lb = logos.onDark.box, LH = 52, LW = lb.w * LH / lb.h;
  const s = [];
  s.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  s.push(`<title>Off Paper - Powered by Tokeniser - episode thumbnail template</title>`);
  s.push(`<defs>
  <style>${['Medium:500','Bold:700','ExtraBold:800'].map(p => { const [n, w] = p.split(':'); return `@font-face{font-family:Montserrat;font-weight:${w};src:url(data:font/ttf;base64,${b64(path.join(B.ASSETS, `Montserrat-${n}.ttf`))}) format('truetype');}`; }).join('')}</style>
  <clipPath id="photo-clip"><rect x="${PX}" y="0" width="${W - PX}" height="${H}"/></clipPath>
  <clipPath id="logo-clip"><rect x="0" y="0" width="${LW}" height="${LH}"/></clipPath>
  <linearGradient id="seam" x1="${PX}" y1="0" x2="${PX + 260}" y2="0" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${C.slate}" stop-opacity="1"/><stop offset="1" stop-color="${C.slate}" stop-opacity="0"/>
  </linearGradient>
</defs>`);
  s.push(`<rect id="LOCKED - Slate background" width="${W}" height="${H}" fill="${C.slate}"/>`);

  // ledger field
  s.push(`<g id="LOCKED - Ledger field" fill="${C.lightBlue}" opacity="${(0.7 * 0.16).toFixed(3)}">`);
  for (let y = 24; y < H; y += 48) for (let x = 24; x < PX; x += 48) s.push(`<circle cx="${x}" cy="${y}" r="2.16"/>`);
  s.push('</g>');

  // photo group
  s.push(`<g id="EDIT - Guest photo (replace image fill)" clip-path="url(#photo-clip)">`);
  s.push(`<image id="Guest photo" x="${PX}" y="0" width="${W - PX}" height="${H}" preserveAspectRatio="xMidYMid slice" xlink:href="${photoSrc}" href="${photoSrc}"/>`);
  s.push(`<rect id="LOCKED - Slate overlay 30%" x="${PX}" y="0" width="${W - PX}" height="${H}" fill="${C.slate}" opacity="0.3"/>`);
  s.push(`<rect id="LOCKED - Seam" x="${PX}" y="0" width="260" height="${H}" fill="url(#seam)"/>`);
  // cascade - same deterministic pattern as drawCascade
  s.push(`<g id="LOCKED - Tile cascade 60%">`);
  const pitch = 44, cols = 7, rows = 7, cx0 = PX - 8, cy0 = H - 7 * 44 - 40;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const k = (c + 1) / cols;
    const h = Math.abs(Math.sin((r * 12.9898 + c * 78.233) * 43758.5453)) % 1;
    if (h > 1 - k * 0.85) continue;
    const sz = pitch * (0.82 - 0.4 * k);
    const op = 0.6 * (1 - k * 0.55);
    const fill = h < 0.18 ? C.lightMint : C.mint;
    s.push(`<rect x="${(cx0 + c * pitch + (pitch - sz) / 2).toFixed(2)}" y="${(cy0 + r * pitch + (pitch - sz) / 2).toFixed(2)}" width="${sz.toFixed(2)}" height="${sz.toFixed(2)}" rx="${(sz * 0.12).toFixed(2)}" fill="${fill}" opacity="${op.toFixed(3)}"/>`);
  }
  s.push('</g></g>');

  // folio mark
  s.push(`<g id="LOCKED - Folio mark" opacity="0.7" transform="translate(${M} 78)">`);
  OP.folioLayout(76).forEach(t => s.push(`<rect x="${t.x.toFixed(2)}" y="${t.y.toFixed(2)}" width="${t.s.toFixed(2)}" height="${t.s.toFixed(2)}" rx="${(t.s * 0.12).toFixed(2)}" fill="${t.cell.lifted ? C.lightMint : C.mint}"/>`));
  s.push('</g>');

  // show name inline
  s.push(`<text id="LOCKED - Show name" x="${M + 102}" y="128" font-family="Montserrat" font-size="33" xml:space="preserve"><tspan font-weight="800" fill="${C.lightMint}">${OP.NAME_HEAD}</tspan><tspan font-weight="500" fill="${C.mint}"> ${esc(OP.NAME_TAIL)}</tspan></text>`);

  // episode chip
  s.push(`<g id="EDIT - Episode number">`);
  s.push(`<rect id="Chip" x="${M}" y="236" width="230" height="68" rx="10" fill="${C.mint}"/>`);
  s.push(`<text id="Episode number text" x="${M + 26}" y="284" font-family="Montserrat" font-weight="800" font-size="40" letter-spacing="3" fill="${C.slate}">EP 30</text>`);
  s.push('</g>');

  // title, 3 lines
  const titleLines = ['Your Episode', 'Title Goes', 'Here'];
  const tpx = 112, tlh = tpx * 1.04, ty = 236 + 68 + 44 + tpx * 0.8;
  s.push(`<text id="EDIT - Episode title (max 3 lines, ~16 characters per line)" x="${M - 3}" y="${ty.toFixed(1)}" font-family="Montserrat" font-weight="800" font-size="${tpx}" fill="${C.lightMint}">`);
  titleLines.forEach((l, i) => s.push(`<tspan x="${M - 3}" y="${(ty + i * tlh).toFixed(1)}">${esc(l)}</tspan>`));
  s.push('</text>');

  // guest block
  const roleY = H - M - 4, nameY = roleY - 62;
  s.push(`<rect id="LOCKED - Teal rule" x="${M}" y="${nameY - 56 - 30}" width="88" height="5" fill="${C.teal}" opacity="0.7"/>`);
  s.push(`<text id="EDIT - Guest name" x="${M}" y="${nameY}" font-family="Montserrat" font-weight="700" font-size="56" fill="${C.mint}">Guest Name</text>`);
  s.push(`<text id="EDIT - Guest role" x="${M}" y="${roleY}" font-family="Montserrat" font-weight="500" font-size="38" fill="${C.lightBlue}">Organisation</text>`);

  // logo - original supplied PNG, cropped to artwork by an unscaled clip only
  const sc = LH / lb.h;
  const lx = W - M + 24 - LW, ly = H - M + 8 - LH;
  const logoImg = await B.loadImage(fs.readFileSync(logos.onDark.file));
  s.push(`<g id="LOCKED - Tokeniser logo (supplied file, do not edit)" transform="translate(${lx.toFixed(2)} ${ly.toFixed(2)})"><g clip-path="url(#logo-clip)"><image x="${(-lb.x * sc).toFixed(3)}" y="${(-lb.y * sc).toFixed(3)}" width="${(logoImg.width * sc).toFixed(3)}" height="${(logoImg.height * sc).toFixed(3)}" xlink:href="${logoSrc}" href="${logoSrc}"/></g></g>`);
  s.push('</svg>');
  fs.writeFileSync(path.join(OUT, 'offpaper-thumbnail-template.svg'), s.join('\n'));
  console.log('templates done');
}

main().catch(e => { console.error(e); process.exit(1); });
