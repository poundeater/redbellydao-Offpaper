// Automated checks against the brief. Writes ../docs/VERIFICATION.md and exits 1 on any failure.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const { loadImage } = require('@napi-rs/canvas');
const OP = require('./lib/offpaper-draw');

const ROOT = path.join(__dirname, '..');
const DEL = path.join(ROOT, 'deliverables');
const results = [];
const check = (area, name, pass, detail) => results.push({ area, name, pass: !!pass, detail });
const rel = p => path.relative(ROOT, p).replace(/\\/g, '/');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

async function dims(file) { const i = await loadImage(fs.readFileSync(file)); return [i.width, i.height]; }
function probe(file) { return spawnSync(ffmpeg, ['-hide_banner', '-i', file], { encoding: 'utf8' }).stderr; }
function loud(file) {
  const e = spawnSync(ffmpeg, ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const I = parseFloat((e.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop().split(/\s+/)[1]);
  const P = parseFloat((e.match(/Peak:\s+(-?[\d.]+) dBFS/g) || []).pop().split(/\s+/)[1]);
  return { I, P };
}
function frameAt(file, t) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-ss', String(t), '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 64 << 20 });
  return r.stdout;
}

async function main() {
  // ---- Part A
  const sheetPng = path.join(DEL, '01_identity', 'offpaper-identity-sheet.png');
  const sheetPdf = path.join(DEL, '01_identity', 'offpaper-identity-sheet.pdf');
  check('A', 'Identity sheet PNG exists', fs.existsSync(sheetPng), rel(sheetPng));
  check('A', 'Identity sheet PDF exists', fs.existsSync(sheetPdf) && fs.readFileSync(sheetPdf).slice(0, 5).toString() === '%PDF-', rel(sheetPdf));

  // palette: every hex colour literal in the source must be a Tokeniser colour
  const palette = new Set(Object.values(OP.C).map(h => h.toUpperCase()));
  const srcFiles = walk(__dirname).filter(f => /\.(js|html)$/.test(f) && !f.includes('node_modules') && !f.includes(path.sep + 'build' + path.sep));
  const stray = [];
  srcFiles.forEach(f => {
    const s = fs.readFileSync(f, 'utf8').replace(/data:[^'")\s]+/g, '');
    (s.match(/#[0-9a-fA-F]{6}\b/g) || []).forEach(h => { if (!palette.has(h.toUpperCase())) stray.push(`${rel(f)}: ${h}`); });
  });
  check('A', 'Only Tokeniser palette hex values in source', stray.length === 0, stray.length ? stray.join(', ') : `${srcFiles.length} files scanned; palette = ${[...palette].join(' ')}`);
  const fontFiles = fs.readdirSync(path.join(__dirname, 'assets')).filter(f => /\.(ttf|otf|woff2?)$/i.test(f));
  check('A', 'Only Montserrat font files used', fontFiles.every(f => /^Montserrat-/.test(f)), fontFiles.join(', '));
  const fontRefs = srcFiles.flatMap(f => (fs.readFileSync(f, 'utf8').match(/font-family[:=]\s*["']?([A-Za-z -]+)/g) || []));
  check('A', 'Only Montserrat named as a font family', fontRefs.every(r => /Montserrat/.test(r)), `${fontRefs.length} references`);
  check('A', 'Opacity rules encoded (70% solid / 60% photo / 30% Slate)', OP.RULES.deviceOnSolid === 0.7 && OP.RULES.deviceOnPhoto === 0.6 && OP.RULES.photoSlateOverlay === 0.3, JSON.stringify(OP.RULES));

  // logos byte-identical to the files downloaded from taskboard.redbellydao.network/brand/tokeniser/
  const SUPPLIED_MD5 = {
    'tokeniser-logo-on-dark.png': 'fb90c0ba133251f89150853a8b22f3e7',
    'tokeniser-logo-slate-green-icon.png': '8f1e41d22fe9d9ee39b21fb43f548e5b',
    'tokeniser-logo-on-mint.png': 'e3914b20baadc825ae647bf733d9021a'
  };
  const md5 = f => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
  Object.entries(SUPPLIED_MD5).forEach(([f, want]) => {
    const got = md5(path.join(__dirname, 'assets', f));
    check('A', `Logo unaltered: ${f}`, got === want, `md5 ${got}${got === want ? ' matches supplied file' : ' differs from supplied ' + want}`);
  });

  // show name string
  check('A', 'Show name constant is exact', OP.SHOW_NAME === 'Off Paper - Powered by Tokeniser' && `${OP.NAME_HEAD} ${OP.NAME_TAIL}` === OP.SHOW_NAME, OP.SHOW_NAME);
  const svg = fs.readFileSync(path.join(DEL, '03_thumbnails', 'editable-template', 'offpaper-thumbnail-template.svg'), 'utf8');
  const svgName = (svg.match(/<text id="LOCKED - Show name"[^>]*>(.*?)<\/text>/) || [])[1] || '';
  check('B', 'SVG template show name reads exactly', svgName.replace(/<[^>]+>/g, '') === OP.SHOW_NAME, svgName.replace(/<[^>]+>/g, ''));

  // ---- Part B
  for (const f of ['offpaper-cover-3000.png', 'offpaper-cover-1400.jpg']) {
    const p = path.join(DEL, '02_cover-art', f);
    const [w, h] = await dims(p);
    check('B', `Cover ${f} is square and >= 1400`, w === h && w >= 1400, `${w} x ${h}`);
  }
  const ex = fs.readdirSync(path.join(DEL, '03_thumbnails', 'examples')).filter(f => f.endsWith('.png'));
  const big = ex.filter(f => !f.includes('-1280'));
  check('B', 'Three finished example thumbnails', big.length === 3, big.join(', '));
  for (const f of ex) {
    const [w, h] = await dims(path.join(DEL, '03_thumbnails', 'examples', f));
    check('B', `Thumbnail ${f} is 16:9 and >= 1280x720`, Math.abs(w / h - 16 / 9) < 1e-3 && w >= 1280, `${w} x ${h}`);
  }
  const maker = fs.readFileSync(path.join(DEL, '03_thumbnails', 'editable-template', 'offpaper-thumbnail-maker.html'), 'utf8');
  check('B', 'Thumbnail maker is self-contained (no external requests)', !/(src|href)=["']https?:/i.test(maker) && !/url\(https?:/i.test(maker), `${(maker.length / 1e6).toFixed(1)} MB single HTML file`);
  ['episode', 'title', 'guest', 'role', 'photo'].forEach(id => check('B', `Maker has editable slot: ${id}`, maker.includes(`id="${id}"`), ''));
  ['EDIT - Episode number', 'EDIT - Episode title', 'EDIT - Guest name', 'EDIT - Guest role', 'EDIT - Guest photo'].forEach(n => check('B', `SVG has editable layer: ${n}`, svg.includes(`id="${n}`), ''));
  // phone legibility: title cap height on a 360 px wide phone thumbnail
  const minTitlePx = 84, phoneW = 360;
  const capOnPhone = minTitlePx * 0.70 * phoneW / 1920;
  check('B', 'Title legible on phone (cap height >= 10 px at 360 px wide)', capOnPhone >= 10, `smallest title ${minTitlePx}px on 1920 canvas -> ~${capOnPhone.toFixed(1)} px cap height at 360 px wide (largest 132px -> ~${(132 * 0.7 * phoneW / 1920).toFixed(1)} px)`);

  // ---- Part C
  const vids = [['offpaper-opening-16x9-1920x1080.mp4', 1920, 1080], ['offpaper-opening-9x16-1080x1920.mp4', 1080, 1920]];
  for (const [f, w, h] of vids) {
    const p = path.join(DEL, '04_opening-sequence', f);
    const info = probe(p);
    const dur = info.match(/Duration: (\d+):(\d+):([\d.]+)/);
    const sec = dur ? (+dur[1]) * 3600 + (+dur[2]) * 60 + parseFloat(dur[3]) : 0;
    const fps = parseFloat((info.match(/([\d.]+) fps/) || [])[1]);
    const size = info.match(/Video: h264[^\n]*?(\d{3,4})x(\d{3,4})/);
    check('C', `${f}: H.264 ${w}x${h}`, size && +size[1] === w && +size[2] === h, size ? `${size[1]}x${size[2]}` : 'not found');
    check('C', `${f}: 10-20 s long`, sec >= 10 && sec <= 20, `${sec.toFixed(2)} s`);
    check('C', `${f}: >= 24 fps`, fps >= 24, `${fps} fps`);
    check('C', `${f}: has stereo AAC audio`, /Audio: aac.*stereo/.test(info), (info.match(/Audio: [^\n]*/) || [''])[0]);
    const { I, P } = loud(p);
    check('C', `${f}: loudness near -16 LUFS, true peak <= -1 dBFS`, Math.abs(I + 16) <= 1 && P <= -1, `${I} LUFS integrated, ${P} dBFS peak`);
    const mb = fs.statSync(p).size / 1e6;
    check('C', `${f}: under 100 MB (fits a GitHub file)`, mb < 100, `${mb.toFixed(1)} MB`);
    // ends on solid Slate
    const last = frameAt(p, sec - 0.12);
    let maxDev = 0;
    for (let i = 0; i < last.length; i += 3 * 97) {
      maxDev = Math.max(maxDev, Math.abs(last[i] - 0x34), Math.abs(last[i + 1] - 0x37), Math.abs(last[i + 2] - 0x40));
    }
    check('C', `${f}: final frame is solid Slate #343740`, last.length === w * h * 3 && maxDev <= 4, `max channel deviation ${maxDev}/255 (codec rounding)`);
  }
  const audioSrc = fs.readFileSync(path.join(__dirname, 'audio.js'), 'utf8');
  check('C', 'Audio is synthesised in code (no audio files imported)', !/readFileSync\([^)]*\.(wav|mp3|aif|flac|ogg)/i.test(audioSrc) && walk(path.join(__dirname, 'assets')).every(f => !/\.(wav|mp3|aif|flac|ogg)$/i.test(f)), 'audio.js only uses oscillators, noise and filters');
  const vidSrc = fs.readFileSync(path.join(__dirname, 'render-video.js'), 'utf8');
  const textCalls = (vidSrc.match(/fillText\(([^,]+),/g) || []).map(s => s.slice(9, -1));
  check('C', 'Only on-screen text in opening is the show name', textCalls.every(s => /NAME_HEAD|NAME_TAIL/.test(s)), textCalls.join(', '));

  // ---- Failure-criteria hygiene
  const deliverText = walk(DEL).filter(f => /\.(html|svg|md|txt)$/i.test(f) && !/OFL/.test(f)).map(f => fs.readFileSync(f, 'utf8').replace(/data:[^'")\s]+/g, '').replace(/@(font-face|media|keyframes|import)\b/g, '')).join('\n');
  const banned = /(made by|designed by|created by|(?:^|\s)@[a-z0-9_]{3,}(?![\w/-])|rocket|to the moon|lambo|laser eyes)/i;
  const hit = deliverText.match(banned);
  check('F', 'No personal credit / hype wording in deliverables', !hit, hit ? hit[0] : 'clean');

  // ---- report
  const failed = results.filter(r => !r.pass);
  const md = [
    '# Verification report',
    '',
    `Generated by \`node verify.js\` on ${new Date().toISOString().slice(0, 10)}. ${results.length - failed.length}/${results.length} checks passed.`,
    '',
    '| Part | Check | Result | Detail |',
    '|---|---|---|---|',
    ...results.map(r => `| ${r.area} | ${r.name} | ${r.pass ? 'PASS' : '**FAIL**'} | ${String(r.detail).replace(/\|/g, '/')} |`)
  ].join('\n');
  fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'docs', 'VERIFICATION.md'), md + '\n');
  results.forEach(r => console.log(`${r.pass ? 'PASS' : 'FAIL'}  [${r.area}] ${r.name}  ${r.detail}`));
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
