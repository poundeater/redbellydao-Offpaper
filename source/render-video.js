/*
 * Off Paper - Powered by Tokeniser : opening sequence renderer.
 *
 * Story (told only with shape, light and motion):
 *   a document surfaces from the dark -> light reads across it ->
 *   a scan line turns the page into discrete tiles that turn over and lift ->
 *   the tiles assemble into linked blocks -> a pulse runs the chain ->
 *   the chain folds into the Folio mark -> show name + Tokeniser logo -> fade to Slate.
 *
 * Usage:
 *   node render-video.js landscape|vertical            render MP4 (needs build/opening-audio.wav)
 *   node render-video.js landscape|vertical --stills   write review frames only
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const B = require('./lib/node-brand');
const TL = require('./lib/timeline');
const { OP, createCanvas } = B;
const C = OP.C;
const ALPHA = OP.RULES.deviceOnSolid;

const FORMAT = process.argv[2] || 'landscape';
const STILLS = process.argv.includes('--stills');
const PORTRAIT = FORMAT === 'vertical';
const W = PORTRAIT ? 1080 : 1920;
const H = PORTRAIT ? 1920 : 1080;
const { FPS, DURATION, SHEET, BLOCKS, BLOCK_N, T } = TL;
const FRAMES = Math.round(FPS * DURATION);

// ---------- maths ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => 1 - Math.pow(1 - clamp(t), 3);                 // ease-out cubic
const inOut = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const span = (t, [a, b]) => clamp((t - a) / (b - a));
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const rad = d => d * Math.PI / 180;

const v3 = (x, y, z) => ({ x, y, z });
const vAdd = (a, b) => v3(a.x + b.x, a.y + b.y, a.z + b.z);
const vLerp = (a, b, t) => v3(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));

const qAxis = (x, y, z, a) => { const s = Math.sin(a / 2); return [Math.cos(a / 2), x * s, y * s, z * s]; };
const qMul = (a, b) => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]
];
const qEuler = (rx, ry, rz) => qMul(qAxis(0, 0, 1, rz), qMul(qAxis(0, 1, 0, ry), qAxis(1, 0, 0, rx)));
const qRot = (q, v) => {
  const [w, x, y, z] = q;
  const ix = w * v.x + y * v.z - z * v.y, iy = w * v.y + z * v.x - x * v.z;
  const iz = w * v.z + x * v.y - y * v.x, iw = -x * v.x - y * v.y - z * v.z;
  return v3(ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x);
};
const qSlerp = (a, b, t) => {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let bb = b;
  if (d < 0) { d = -d; bb = b.map(v => -v); }
  if (d > 0.9995) { const r = a.map((v, i) => lerp(v, bb[i], t)); const n = Math.hypot(...r); return r.map(v => v / n); }
  const th = Math.acos(d), s = Math.sin(th);
  const wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
  return a.map((v, i) => v * wa + bb[i] * wb);
};
const Q_ID = [1, 0, 0, 0];

// camera: pinhole at z = -D looking down +z; at z = 0 one world unit = one pixel
const D = 1600, F = 1600;
const project = p => { const k = F / (p.z + D); return { x: W / 2 + p.x * k, y: H / 2 + p.y * k, k }; };

// ---------- layout per format ----------
const TS = PORTRAIT ? 44 : 34;  // tile pitch on the sheet
const CHAIN_PITCH = 36;        // tile pitch inside a block
const BSP = PORTRAIT ? 290 : 270;               // block spacing along the chain
const L = PORTRAIT ? {
  sheetPos: t => v3(0, lerp(-20, -70, inOut(t / 8)), lerp(620, 120, inOut(t / 7.5))),
  sheetRot: t => { const p = inOut(t / 8); return qEuler(rad(lerp(50, 30, p)), rad(lerp(6, -4, p)), rad(lerp(-16, -8, p))); },
  chainAxis: v3(0, 1, 0),
  chainOrigin: v3(0, 30, 560),
  chainRot: t => qEuler(rad(lerp(30, 20, span(t, [7, 11]))), rad(lerp(10, 4, span(t, [7, 11]))), 0),
  emblem: 300, emblemCenter: { x: W / 2, y: 690 },
  name: { x: W / 2, y: 1085, px: 150, align: 'center' },
  logo: { h: 64 }
} : {
  sheetPos: t => v3(lerp(-150, -60, inOut(t / 8)), 0, lerp(620, 170, inOut(t / 7.5))),
  sheetRot: t => { const p = inOut(t / 8); return qEuler(rad(lerp(52, 34, p)), rad(lerp(-16, -6, p)), rad(lerp(-26, -14, p))); },
  chainAxis: v3(1, 0, 0),
  chainOrigin: v3(170, 30, 560),
  chainRot: t => qEuler(rad(10), rad(lerp(-31, -21, span(t, [7, 11]))), rad(lerp(-3, 0, span(t, [7, 11])))),
  emblem: 240, emblemCenter: null, // resolved after fonts load (centred group)
  name: { x: 0, y: 0, px: 150, align: 'left' },
  logo: { h: 58 }
};

// ---------- tiles ----------
function buildTiles() {
  const tiles = [];
  const { cols, rows } = SHEET;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const key = (c / (cols - 1) + r / (rows - 1)) / 2;
      const ang = hash(i * 3.1) * Math.PI;
      tiles.push({
        i, r, c,
        local: v3((c - (cols - 1) / 2) * TS, (r - (rows - 1) / 2) * TS, 0),
        ta: lerp(T.scan[0], T.scan[1], key) + hash(i * 7.7) * T.scanJitter,
        lift: 50 + 90 * hash(i * 1.9),
        axis: [Math.cos(ang), Math.sin(ang)],
        bob: hash(i * 5.3) * Math.PI * 2
      });
    }
  }
  // tiles join blocks in the order the scan released them
  const order = [...tiles].sort((a, b) => a.ta - b.ta);
  order.forEach((t, o) => { t.block = Math.floor(o / (BLOCK_N * BLOCK_N)); t.rank = o % (BLOCK_N * BLOCK_N); });
  for (let b = 0; b < BLOCKS; b++) {
    const members = order.filter(t => t.block === b);
    const cells = members.map((_, k) => k).sort((a, b2) => hash(a * 13.3 + b * 2.1) - hash(b2 * 13.3 + b * 2.1));
    members.forEach((t, k) => {
      t.cell = cells[k];
      t.cr = Math.floor(t.cell / BLOCK_N);
      t.cc = t.cell % BLOCK_N;
      t.tt = T.travelStart + b * T.blockStagger + (t.rank / 35) * T.cellStagger;
    });
  }
  return tiles;
}

// ---------- textures ----------
function paperTexture() {
  const px = 64, w = SHEET.cols * px, h = SHEET.rows * px;
  const cv = createCanvas(w, h);
  const x = cv.getContext('2d');
  x.fillStyle = C.lightMint;
  x.fillRect(0, 0, w, h);
  // fibres
  for (let i = 0; i < 2600; i++) {
    const a = hash(i * 1.3) * Math.PI, l = 6 + 18 * hash(i * 2.7);
    const cx = hash(i * 3.9) * w, cy = hash(i * 4.1) * h;
    x.strokeStyle = OP.rgba(C.lightBlue, 0.10 + 0.22 * hash(i * 6.1));
    x.lineWidth = 1 + hash(i * 8.3);
    x.beginPath();
    x.moveTo(cx, cy);
    x.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l);
    x.stroke();
  }
  // border, a certificate-like frame
  x.strokeStyle = OP.rgba(C.blue, 0.45);
  x.lineWidth = 4;
  x.strokeRect(36, 36, w - 72, h - 72);
  x.strokeStyle = OP.rgba(C.lightBlue, 0.9);
  x.lineWidth = 2;
  x.strokeRect(50, 50, w - 100, h - 100);
  // heading bar
  x.fillStyle = OP.rgba(C.blue, 0.55);
  OP.roundedRect(x, 110, 108, w * 0.46, 30, 15); x.fill();
  x.fillStyle = OP.rgba(C.blue, 0.25);
  OP.roundedRect(x, 110, 158, w * 0.28, 14, 7); x.fill();
  // ruled lines of an abstract body text
  let y = 230, n = 0;
  while (y < h - 330) {
    const para = n % 6 === 5;
    const len = para ? 0.35 + 0.2 * hash(n) : 0.72 + 0.18 * hash(n * 1.7);
    x.strokeStyle = OP.rgba(n % 9 === 0 ? C.blue : C.lightBlue, n % 9 === 0 ? 0.35 : 1);
    x.lineWidth = 9;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(110, y);
    x.lineTo(110 + (w - 220) * len, y);
    x.stroke();
    y += para ? 64 : 36;
    n++;
  }
  // seal
  const sx = w - 190, sy = h - 200;
  x.strokeStyle = OP.rgba(C.teal, 0.85);
  x.lineWidth = 6;
  x.beginPath(); x.arc(sx, sy, 78, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 2;
  x.beginPath(); x.arc(sx, sy, 60, 0, Math.PI * 2); x.stroke();
  for (let k = 0; k < 36; k++) {
    const a = k / 36 * Math.PI * 2;
    x.beginPath();
    x.moveTo(sx + Math.cos(a) * 64, sy + Math.sin(a) * 64);
    x.lineTo(sx + Math.cos(a) * 74, sy + Math.sin(a) * 74);
    x.stroke();
  }
  // signature line with an abstract flourish (no letters)
  x.strokeStyle = OP.rgba(C.blue, 0.55);
  x.lineWidth = 3;
  x.beginPath(); x.moveTo(110, h - 150); x.lineTo(470, h - 150); x.stroke();
  x.lineWidth = 4;
  x.beginPath();
  x.moveTo(130, h - 175);
  x.bezierCurveTo(190, h - 260, 220, h - 120, 270, h - 200);
  x.bezierCurveTo(310, h - 260, 330, h - 160, 420, h - 190);
  x.stroke();
  return { cv, px };
}

// ---------- scene ----------
async function main() {
  B.registerFonts();
  const logos = await B.loadLogos();
  const logo = logos.onDark;
  const tiles = buildTiles();
  const paper = paperTexture();
  const grain = B.makeGrain(512, 3, 0.85);

  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');

  // landscape lockup: [Folio] [stacked name] centred as one group
  if (!PORTRAIT) {
    const nameW = OP.measureNameStacked(ctx, L.name.px);
    const gap = 64;
    const groupW = L.emblem + gap + nameW;
    const gx = Math.round((W - groupW) / 2);
    L.emblemCenter = { x: gx + L.emblem / 2, y: H / 2 - 20 };
    const capH = L.name.px * 0.72, tailPx = Math.round(L.name.px * 0.34);
    const blockH = capH + tailPx * 1.55;
    L.name.x = gx + L.emblem + gap;
    L.name.y = Math.round(L.emblemCenter.y - blockH / 2 + capH - 30);
  }
  const emPitch = L.emblem / BLOCK_N;
  const folio = OP.folioLayout(L.emblem).map(f => ({
    x: f.x + f.s / 2 - L.emblem / 2, y: f.y + f.s / 2 - L.emblem / 2, s: f.s, lifted: f.cell.lifted
  }));
  const emWorld = v3(L.emblemCenter.x - W / 2, L.emblemCenter.y - H / 2, 0);

  const A = L.chainAxis;
  const blockCentre = b => v3(A.x * (b - (BLOCKS - 1) / 2) * BSP, A.y * (b - (BLOCKS - 1) / 2) * BSP, 0);
  const MID = (BLOCKS - 1) / 2;

  function chainFrame(t) {
    const E = inOut(span(t, T.converge));
    return { E, q: qSlerp(L.chainRot(t), Q_ID, E), origin: vLerp(L.chainOrigin, emWorld, E) };
  }
  function chainPoint(ch, local) { return vAdd(qRot(ch.q, local), ch.origin); }

  function tileState(tl, t, sheetQ, sheetP, ch, paperIn) {
    // --- on the sheet
    const u = t - tl.ta;
    const sf = 1 - 0.16 * ease(u / 0.5);
    const liftZ = -ease((u - 0.1) / 1.2) * tl.lift;
    const flip = Math.PI * inOut((u - 0.25) / 0.9);
    const hover = ease((u - 0.6) / 1.0) * Math.sin(t * 1.6 + tl.bob) * 6;
    const sinkZ = (1 - paperIn) * 420;
    const ls = v3(tl.local.x, tl.local.y + hover, liftZ + sinkZ);
    const qS = qMul(sheetQ, qAxis(tl.axis[0], tl.axis[1], 0, flip));
    const pS = vAdd(qRot(sheetQ, ls), sheetP);

    // --- in the chain
    const E = ch.E;
    const isMid = tl.block === MID;
    const fc = folio[tl.cell];
    const chainCell = v3((tl.cc - 2.5) * CHAIN_PITCH, (tl.cr - 2.5) * CHAIN_PITCH, 0);
    const bc = blockCentre(tl.block);
    const local = v3(
      bc.x * (1 - E) + lerp(chainCell.x, fc.x, E),
      bc.y * (1 - E) + lerp(chainCell.y, fc.y, E),
      isMid ? 0 : E * (30 + 25 * Math.abs(tl.block - MID))
    );
    const pC = chainPoint(ch, local);
    const qC = qMul(ch.q, qAxis(0, 1, 0, Math.PI));
    const sC = lerp(CHAIN_PITCH * 0.82, fc.s, E);

    const m = inOut((t - tl.tt) / T.travelDur);
    const arc = Math.sin(Math.PI * m);
    const p = vLerp(pS, pC, m);
    p.z -= arc * 230;
    p.y -= arc * 50;
    const q = m <= 0 ? qS : m >= 1 ? qC : qSlerp(qS, qC, m);
    const size = lerp(TS * sf, sC, m);
    let alpha = ALPHA * paperIn;
    if (!isMid) alpha *= 1 - smooth(0.25, 0.8, E);
    const paperRound = ease(u / 0.6);
    const liftedTint = isMid && fc.lifted ? E : 0;
    return { p, q, size, alpha, paperRound, liftedTint };
  }

  function drawTile(tl, st, sweep) {
    if (st.alpha <= 0.002) return;
    const h = st.size / 2;
    const P0 = project(vAdd(st.p, qRot(st.q, v3(-h, -h, 0))));
    const P1 = project(vAdd(st.p, qRot(st.q, v3(h, -h, 0))));
    const P2 = project(vAdd(st.p, qRot(st.q, v3(-h, h, 0))));
    const Ux = P1.x - P0.x, Uy = P1.y - P0.y, Vx = P2.x - P0.x, Vy = P2.y - P0.y;
    const det = Ux * Vy - Uy * Vx;
    if (Math.abs(det) < 0.5) return;
    const n = qRot(st.q, v3(0, 0, -1));
    const facing = Math.abs(n.z);
    ctx.save();
    ctx.globalAlpha = st.alpha;
    ctx.setTransform(Ux, Uy, Vx, Vy, P0.x, P0.y);
    const rr = 0.12 * st.paperRound;
    if (det > 0) {
      // paper side
      ctx.save();
      if (rr > 0.001) { OP.roundedRect(ctx, 0, 0, 1, 1, rr); ctx.clip(); }
      ctx.drawImage(paper.cv, tl.c * paper.px, tl.r * paper.px, paper.px, paper.px, -0.004, -0.004, 1.008, 1.008);
      ctx.restore();
    } else {
      // token side
      ctx.fillStyle = st.liftedTint > 0 ? OP.mixHex(C.mint, C.lightMint, st.liftedTint) : C.mint;
      OP.roundedRect(ctx, 0, 0, 1, 1, 0.12);
      ctx.fill();
      ctx.strokeStyle = OP.rgba(C.teal, 0.55 * (1 - st.liftedTint));
      ctx.lineWidth = 0.05;
      OP.roundedRect(ctx, 0.14, 0.14, 0.72, 0.72, 0.08);
      ctx.stroke();
    }
    // light: turn away = darker, light band = brighter
    const shade = (1 - facing) * 0.45;
    if (shade > 0.01) { ctx.fillStyle = OP.rgba(C.slate, shade); OP.roundedRect(ctx, 0, 0, 1, 1, Math.max(rr, det > 0 ? 0 : 0.12)); ctx.fill(); }
    if (sweep > 0.01) { ctx.fillStyle = OP.rgba(C.lightMint, sweep * 0.55); OP.roundedRect(ctx, 0, 0, 1, 1, rr); ctx.fill(); }
    ctx.restore();
  }

  function polyline(pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); }

  const dust = Array.from({ length: 70 }, (_, i) => ({
    x: hash(i * 9.1), y: hash(i * 4.4), r: 1.2 + 2.4 * hash(i * 2.2), a: 0.08 + 0.22 * hash(i * 6.6), sp: 6 + 14 * hash(i * 3.3)
  }));

  function background(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.slate;
    ctx.fillRect(0, 0, W, H);
    const gIn = smooth(0, 2.5, t);
    const gx = W * lerp(0.62, 0.48, t / DURATION), gy = H * lerp(0.36, 0.44, t / DURATION);
    const g = ctx.createRadialGradient(gx, gy, 10, gx, gy, Math.max(W, H) * 0.75);
    g.addColorStop(0, OP.rgba(C.blue, 0.85 * gIn));
    g.addColorStop(1, OP.rgba(C.blue, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // ledger field drifting slowly
    ctx.save();
    ctx.translate(-(t * 4) % 60, -(t * 2) % 60);
    OP.drawLedgerField(ctx, 0, 0, W + 60, H + 60, 60, { strength: 0.13 * gIn });
    ctx.restore();
    // dust
    ctx.fillStyle = C.lightMint;
    dust.forEach(d => {
      const y = ((d.y * H - t * d.sp) % H + H) % H;
      ctx.globalAlpha = d.a * gIn;
      ctx.beginPath();
      ctx.arc(d.x * W, y, d.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function scanLine(t, sheetQ, sheetP, paperIn) {
    const k = span(t, T.scan);
    if (k <= 0 || k >= 1) return;
    const { cols, rows } = SHEET;
    const pts = [];
    for (let s = 0; s <= 200; s++) {
      const cc = (s / 200) * (cols - 1);
      const rr = (2 * k - cc / (cols - 1)) * (rows - 1);
      if (rr < 0 || rr > rows - 1) continue;
      pts.push(v3((cc - (cols - 1) / 2) * TS, (rr - (rows - 1) / 2) * TS, -3 + (1 - paperIn) * 420));
    }
    if (pts.length < 2) return;
    const a = project(vAdd(qRot(sheetQ, pts[0]), sheetP)), b = project(vAdd(qRot(sheetQ, pts[pts.length - 1]), sheetP));
    const fade = Math.sin(Math.PI * k);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = ALPHA * fade;
    ctx.strokeStyle = C.mint;
    ctx.shadowColor = C.mint;
    ctx.shadowBlur = 28;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = C.lightMint;
    ctx.stroke();
    ctx.restore();
  }

  function sheetGhost(t, sheetQ, sheetP) {
    const a = smooth(3.2, 4.2, t) * (1 - smooth(7.2, 8.8, t));
    if (a <= 0) return;
    const hw = SHEET.cols * TS / 2 + 6, hh = SHEET.rows * TS / 2 + 6;
    const pts = [v3(-hw, -hh, 0), v3(hw, -hh, 0), v3(hw, hh, 0), v3(-hw, hh, 0), v3(-hw, -hh, 0)].map(p => project(vAdd(qRot(sheetQ, p), sheetP)));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = ALPHA * 0.45 * a;
    ctx.strokeStyle = C.lightBlue;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    polyline(pts);
    ctx.stroke();
    ctx.restore();
  }

  function chainDevices(t, ch) {
    const E = ch.E;
    const fadeAll = 1 - smooth(0, 0.45, E);
    if (fadeAll <= 0) return;
    const half = 3 * CHAIN_PITCH + 10;
    const pulseK = inOut(span(t, T.pulses));
    const pulseOn = t > T.pulses[0] && t < T.pulses[1] + 0.3;
    const pulseAlong = lerp(-MID * BSP, MID * BSP, pulseK);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let b = 0; b < BLOCKS; b++) {
      const land = TL.blockLanded(b);
      if (t < land - 0.1) continue;
      const bc = blockCentre(b);
      const along = A.x ? bc.x : bc.y;
      const near = pulseOn ? Math.exp(-Math.pow((along - pulseAlong) / 140, 2)) : 0;
      const flash = Math.exp(-Math.max(0, t - land) * 3.5) * smooth(land - 0.1, land, t);
      const a = (0.22 + 0.78 * Math.max(flash, near)) * fadeAll;
      const o = [v3(-half, -half, 0), v3(half, -half, 0), v3(half, half, 0), v3(-half, half, 0), v3(-half, -half, 0)]
        .map(p => project(chainPoint(ch, vAdd(bc, p))));
      ctx.globalAlpha = ALPHA * a;
      ctx.strokeStyle = C.mint;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      polyline(o);
      ctx.stroke();
    }
    // links
    for (let i = 0; i < BLOCKS - 1; i++) {
      const t0 = TL.linkDrawn(i);
      const pr = ease((t - t0) / T.linkDur);
      if (pr <= 0) continue;
      const a = blockCentre(i), b = blockCentre(i + 1);
      const s = vAdd(a, v3(A.x * (half + 6), A.y * (half + 6), 0));
      const e = vAdd(b, v3(-A.x * (half + 6), -A.y * (half + 6), 0));
      const ps = project(chainPoint(ch, s));
      const pe = project(chainPoint(ch, vLerp(s, e, pr)));
      ctx.globalAlpha = ALPHA * fadeAll;
      ctx.strokeStyle = C.teal;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(ps.x, ps.y); ctx.lineTo(pe.x, pe.y); ctx.stroke();
      ctx.fillStyle = C.mint;
      ctx.beginPath(); ctx.arc(ps.x, ps.y, 4.5, 0, Math.PI * 2); ctx.fill();
      if (pr >= 1) { ctx.beginPath(); ctx.arc(pe.x, pe.y, 4.5, 0, Math.PI * 2); ctx.fill(); }
    }
    // the pulse
    if (pulseOn) {
      const pp = project(chainPoint(ch, v3(A.x * pulseAlong, A.y * pulseAlong, -4)));
      const pa = Math.sin(Math.PI * clamp(span(t, [T.pulses[0], T.pulses[1] + 0.3])));
      const g = ctx.createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, 60);
      g.addColorStop(0, OP.rgba(C.lightMint, ALPHA * pa));
      g.addColorStop(0.25, OP.rgba(C.mint, ALPHA * 0.6 * pa));
      g.addColorStop(1, OP.rgba(C.mint, 0));
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(pp.x - 60, pp.y - 60, 120, 120);
    }
    ctx.restore();
  }

  function emblemFlash(t) {
    const t0 = T.converge[1];
    const a = Math.exp(-Math.max(0, t - t0) * 2.2) * smooth(t0 - 0.25, t0, t);
    if (a <= 0.003) return;
    const { x, y } = L.emblemCenter;
    const r = L.emblem * 1.4;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, OP.rgba(C.mint, 0.32 * a));
    g.addColorStop(1, OP.rgba(C.mint, 0));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  function lockup(t) {
    const pn = inOut(span(t, T.nameIn)), pt = inOut(span(t, T.tailIn)), pl = inOut(span(t, T.logoIn));
    if (pn <= 0) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const N = L.name;
    const tailPx = Math.round(N.px * 0.34);
    // head: rises 26px into place through a mask
    ctx.save();
    ctx.beginPath();
    const capTop = N.y - N.px * 0.78;
    ctx.rect(0, capTop - 8, W, N.px * 0.98 + 16);
    ctx.clip();
    ctx.globalAlpha = pn;
    ctx.translate(0, Math.round((1 - pn) * 60));
    ctx.font = OP.font(800, N.px);
    ctx.textAlign = N.align;
    ctx.fillStyle = C.lightMint;
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = (-N.px * 0.02) + 'px';
    ctx.fillText(OP.NAME_HEAD, N.x, N.y);
    ctx.restore();
    // tail
    ctx.globalAlpha = pt;
    ctx.font = OP.font(500, tailPx);
    ctx.textAlign = N.align;
    ctx.fillStyle = C.mint;
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = (tailPx * 0.01) + 'px';
    ctx.fillText(OP.NAME_TAIL, N.x + (N.align === 'left' ? N.px * 0.04 : 0), N.y + tailPx * 1.55 + Math.round((1 - pt) * 14));
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
    // Tokeniser logo
    if (pl > 0) {
      const lh = L.logo.h, lw = logo.box.w * lh / logo.box.h;
      const ly = Math.round(N.y + tailPx * 1.55 + (PORTRAIT ? 120 : 92));
      const lx = N.align === 'center' ? Math.round(N.x - lw / 2) : Math.round(N.x + N.px * 0.04);
      // hairline device above the logo
      ctx.globalAlpha = ALPHA * pl;
      ctx.fillStyle = C.teal;
      const rw = 96 * pl;
      ctx.fillRect(N.align === 'center' ? Math.round(N.x - rw / 2) : lx, ly - 40, rw, 4);
      OP.drawLogo(ctx, logo.img, logo.box, lx, ly, lh, pl);
    }
    ctx.restore();
  }

  function frame(t) {
    background(t);
    const sheetQ = L.sheetRot(t), sheetP = L.sheetPos(t);
    const paperIn = inOut(span(t, T.paperIn));
    const ch = chainFrame(t);
    sheetGhost(t, sheetQ, sheetP);
    chainDevices(t, ch);

    const sweepK = span(t, T.lightSweep);
    const items = tiles.map(tl => {
      const st = tileState(tl, t, sheetQ, sheetP, ch, paperIn);
      const key = (tl.c / (SHEET.cols - 1) + tl.r / (SHEET.rows - 1)) / 2;
      const sweep = sweepK > 0 && sweepK < 1 ? Math.exp(-Math.pow((key - lerp(-0.2, 1.2, sweepK)) / 0.09, 2)) : 0;
      return { tl, st, sweep, z: st.p.z };
    });
    items.sort((a, b) => b.z - a.z);
    items.forEach(it => drawTile(it.tl, it.st, it.sweep));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    scanLine(t, sheetQ, sheetP, paperIn);
    emblemFlash(t);
    lockup(t);

    // grain
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const pat = ctx.createPattern(grain, 'repeat');
    // grain re-seeds every 2nd frame (15 fps, film-like and lighter to encode)
    const gt = Math.floor(t * FPS / 2);
    ctx.translate(-Math.floor(hash(gt * 91.7) * 512), -Math.floor(hash(gt * 37.3) * 512));
    ctx.fillStyle = pat;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(0, 0, W + 512, H + 512);
    ctx.restore();

    // open from and close on solid Slate
    const fadeIn = 1 - smooth(0, 0.6, t);
    const fadeOut = smooth(T.fadeOut[0], T.fadeOut[1], t);
    const cover = Math.max(fadeIn, fadeOut);
    if (cover > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = OP.rgba(C.slate, cover);
      ctx.fillRect(0, 0, W, H);
    }
  }

  const outDir = path.join(__dirname, '..', 'deliverables', '04_opening-sequence');
  if (STILLS) {
    const dir = path.join(__dirname, 'build', 'stills', FORMAT);
    fs.mkdirSync(dir, { recursive: true });
    for (const s of [1.5, 2.6, 4.2, 5.5, 7.0, 8.5, 10.3, 11.8, 13.0, 15.0, 17.9]) {
      frame(s);
      fs.writeFileSync(path.join(dir, `t${s.toFixed(1).padStart(4, '0')}.png`), cv.toBuffer('image/png'));
    }
    console.log('stills written to', dir);
    return;
  }

  const wav = path.join(__dirname, 'build', 'opening-audio-master.wav');
  if (!fs.existsSync(wav)) throw new Error('Run `node audio.js` first: ' + wav + ' missing');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `offpaper-opening-${PORTRAIT ? '9x16-1080x1920' : '16x9-1920x1080'}.mp4`);
  const ff = spawn(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-i', wav,
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-maxrate', '14M', '-bufsize', '28M', '-profile:v', 'high', '-level', '4.2', '-g', '30',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-c:a', 'aac', '-b:a', '320k', '-ar', '48000',
    '-movflags', '+faststart', '-shortest', out
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', code => (code === 0 ? res() : rej(new Error('ffmpeg exit ' + code)))));
  const t0 = Date.now();
  for (let f = 0; f < FRAMES; f++) {
    frame(f / FPS);
    const buf = Buffer.from(ctx.getImageData(0, 0, W, H).data.buffer);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 60 === 0) process.stdout.write(`\r${FORMAT}: frame ${f}/${FRAMES}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await done;
  console.log(`\n${FORMAT}: wrote ${out}`);
}

main().catch(e => { console.error(e); process.exit(1); });
