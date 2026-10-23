/*
 * Off Paper - Powered by Tokeniser : original score + sound design.
 * Every sample is synthesised here from oscillators and noise. No samples,
 * loops, stock music or recorded material are used, and there is no voice.
 *
 * Output:
 *   build/opening-audio-raw.wav     (pre-loudness)
 *   build/opening-audio-master.wav  (two-pass EBU R128 loudness to -16 LUFS, -1.5 dBTP)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const TL = require('./lib/timeline');
const { T, DURATION } = TL;

const SR = 48000;
const N = Math.round(SR * DURATION);
const L = new Float32Array(N), R = new Float32Array(N);

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
let seed = 20261024;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

function add(i, l, r) { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } }
function panGains(p) { const a = (clamp(p, -1, 1) + 1) * Math.PI / 4; return [Math.cos(a), Math.sin(a)]; }

// simple state-variable filter
function svf() {
  let lp = 0, bp = 0;
  return (x, f, q) => {
    const F = 2 * Math.sin(Math.PI * Math.min(f, SR / 6) / SR);
    const hp = x - lp - q * bp;
    bp += F * hp;
    lp += F * bp;
    return { lp, bp, hp };
  };
}

// ---------- 1. warm pad: additive, band-limited, slowly breathing ----------
// D minor colour, resolving to a bright Dm(add9) on the final hit.
const chords = [
  { t0: 0.0, t1: 6.4, notes: [38, 50, 57, 60, 64, 65] },   // Dm9 (no 3rd doubled)
  { t0: 6.0, t1: 10.9, notes: [34, 46, 53, 57, 62, 65] },  // Bbmaj7
  { t0: 10.5, t1: 12.9, notes: [36, 48, 55, 60, 62, 67] }, // Csus2 lift
  { t0: 12.6, t1: 18.0, notes: [38, 50, 57, 62, 64, 69] }  // Dm(add9) home
];
function pad() {
  chords.forEach((ch, ci) => {
    const fadeIn = ci === 0 ? 2.2 : 0.6, fadeOut = ci === 3 ? 3.6 : 0.6;
    ch.notes.forEach((m, ni) => {
      const voices = [-7, 0, 7]; // cents detune
      const pan = (ni / (ch.notes.length - 1)) * 1.2 - 0.6;
      const [gl, gr] = panGains(pan);
      const base = ni === 0 ? 0.055 : 0.03;
      voices.forEach((cents, vi) => {
        const f0 = mtof(m) * Math.pow(2, cents / 1200);
        const harm = ni === 0 ? 4 : 7;
        const ph = Array.from({ length: harm }, () => (rnd() * 0.5 + 0.5) * TAU);
        const s0 = Math.floor(ch.t0 * SR), s1 = Math.min(N, Math.floor(ch.t1 * SR));
        for (let i = s0; i < s1; i++) {
          const t = i / SR;
          const local = t - ch.t0, rest = ch.t1 - t;
          let env = clamp(local / fadeIn) * clamp(rest / fadeOut);
          env = env * env * (3 - 2 * env);
          if (ci === 3) env *= 1 - 0.35 * clamp((t - 14) / 4); // tail eases away
          // filter opening over time: brighter as paper becomes chain
          const bright = 0.35 + 0.65 * clamp((t - 2) / 10);
          let s = 0;
          for (let h = 1; h <= harm; h++) {
            const amp = Math.pow(h, -1.6) * (h === 1 ? 1 : bright);
            s += amp * Math.sin(TAU * f0 * h * t + ph[h - 1]);
          }
          const breathe = 0.85 + 0.15 * Math.sin(TAU * 0.18 * t + ni + vi);
          const v = s * env * base * breathe / voices.length;
          L[i] += v * gl; R[i] += v * gr;
        }
      });
    });
  });
}

// ---------- 2. paper: soft rustle as the document surfaces ----------
function paperRustle() {
  const f = svf(), f2 = svf();
  const s0 = Math.floor(0.4 * SR), s1 = Math.floor(3.2 * SR);
  let gate = 0;
  for (let i = s0; i < s1; i++) {
    const t = i / SR;
    const env = Math.sin(Math.PI * clamp((t - 0.4) / 2.8)) ** 2;
    if ((rnd() * 0.5 + 0.5) < 0.004) gate = 0.6 + 0.4 * (rnd() * 0.5 + 0.5); // crinkles
    gate *= 0.9993;
    const n = rnd();
    const band = f(n, 2800 + 1200 * Math.sin(t * 3.1), 0.9).bp;
    const air = f2(n, 7000, 1.2).bp;
    const v = (band * (0.35 + gate) + air * 0.12) * env * 0.045;
    const [gl, gr] = panGains(-0.3 + 0.4 * (t - 0.4) / 2.8);
    L[i] += v * gl; R[i] += v * gr;
  }
}

// ---------- 3. scan sweep: a filtered shimmer that tracks the scan line ----------
function scanSweep(panDir) {
  const f = svf();
  const [a, b] = T.scan;
  const s0 = Math.floor((a - 0.2) * SR), s1 = Math.floor((b + 0.4) * SR);
  for (let i = s0; i < s1; i++) {
    const t = i / SR;
    const k = clamp((t - a) / (b - a));
    const env = Math.sin(Math.PI * clamp((t - a + 0.2) / (b - a + 0.6)));
    const fc = 600 * Math.pow(9, k);
    const v = f(rnd(), fc, 0.12).bp * env * 0.05;
    const tone = Math.sin(TAU * (880 + 880 * k) * t) * 0.006 * env;
    const [gl, gr] = panGains(panDir * (k * 1.4 - 0.7));
    L[i] += (v + tone) * gl; R[i] += (v + tone) * gr;
  }
}

// ---------- 4. tile clicks: tiny glassy ticks as tiles turn over ----------
function tileTicks() {
  for (let k = 0; k < 90; k++) {
    const t = T.scan[0] + (T.scan[1] - T.scan[0] + 0.9) * ((k + (rnd() * 0.5 + 0.5) * 0.8) / 90);
    const f = 2400 + (rnd() * 0.5 + 0.5) * 2600;
    const amp = 0.012 + (rnd() * 0.5 + 0.5) * 0.014;
    const [gl, gr] = panGains(rnd() * 0.8);
    const s0 = Math.floor(t * SR);
    for (let j = 0; j < SR * 0.05; j++) {
      const e = Math.exp(-j / (SR * 0.006));
      const v = Math.sin(TAU * f * j / SR) * e * amp;
      add(s0 + j, v * gl, v * gr);
    }
  }
}

// ---------- 5. FM bell: one note per block as it locks into the chain ----------
function bell(t, midi, amp, pan, decay = 1.6, ratio = 3.5) {
  const f = mtof(midi), s0 = Math.floor(t * SR);
  const [gl, gr] = panGains(pan);
  for (let j = 0; j < SR * decay * 2.2; j++) {
    const tt = j / SR;
    const env = Math.exp(-tt / (decay * 0.45)) * clamp(tt / 0.003);
    const idx = 2.2 * Math.exp(-tt / 0.18);
    const v = Math.sin(TAU * f * tt + idx * Math.sin(TAU * f * ratio * tt)) * env * amp;
    add(s0 + j, v * gl, v * gr);
  }
}

// ---------- 6. pulse: soft low heartbeat under the build ----------
function kick(t, amp, f0 = 95, f1 = 44) {
  const s0 = Math.floor(t * SR);
  let ph = 0;
  for (let j = 0; j < SR * 0.6; j++) {
    const tt = j / SR;
    const f = f1 + (f0 - f1) * Math.exp(-tt / 0.045);
    ph += TAU * f / SR;
    const v = Math.sin(ph) * Math.exp(-tt / 0.16) * amp;
    add(s0 + j, v, v);
  }
}

// ---------- 7. riser into the fold, and the final hit ----------
function riser() {
  const f = svf();
  const [a, b] = [T.converge[0] - 0.3, T.converge[1]];
  for (let i = Math.floor(a * SR); i < Math.floor(b * SR); i++) {
    const t = i / SR, k = clamp((t - a) / (b - a));
    const env = k * k * (1 - Math.pow(k, 18));
    const v = f(rnd(), 300 + 6000 * k * k, 0.25).bp * env * 0.08;
    const tone = Math.sin(TAU * mtof(74 + 12 * k * k) * t) * env * 0.008;
    L[i] += v + tone; R[i] += v * 0.9 + tone;
  }
}

function impact(t) {
  kick(t, 0.5, 120, 38);
  // sub tail
  const s0 = Math.floor(t * SR);
  for (let j = 0; j < SR * 3; j++) {
    const tt = j / SR;
    const v = Math.sin(TAU * 36.7 * tt) * Math.exp(-tt / 1.1) * 0.12 * clamp(tt / 0.02);
    add(s0 + j, v, v);
  }
  // airy noise bloom
  const f = svf();
  for (let j = 0; j < SR * 2.5; j++) {
    const tt = j / SR;
    const v = f(rnd(), 5200, 0.6).bp * Math.exp(-tt / 0.5) * 0.06;
    add(s0 + j, v * (0.8 + 0.2 * Math.sin(tt * 7)), v * (0.8 - 0.2 * Math.sin(tt * 7)));
  }
  // chord of bells: the signature
  [[62, -0.35], [69, 0.35], [74, -0.1], [76, 0.15], [81, 0.0]].forEach(([m, p], k) =>
    bell(t + k * 0.012, m, 0.075 - k * 0.008, p, 2.6, k % 2 ? 2 : 3.5));
}

// ---------- reverb: Schroeder/Freeverb-style, stereo ----------
function reverb(inL, inR, mix = 0.28, room = 0.86, damp = 0.35) {
  const combT = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map(n => Math.round(n * SR / 44100));
  const apT = [556, 441, 341, 225].map(n => Math.round(n * SR / 44100));
  const run = (inp, spread) => {
    const out = new Float32Array(N);
    const combs = combT.map(d => ({ buf: new Float32Array(d + spread), i: 0, st: 0 }));
    const aps = apT.map(d => ({ buf: new Float32Array(d + spread), i: 0 }));
    for (let n = 0; n < N; n++) {
      const x = inp[n] * 0.015;
      let s = 0;
      for (const c of combs) {
        const y = c.buf[c.i];
        c.st = y * (1 - damp) + c.st * damp;
        c.buf[c.i] = x + c.st * room;
        c.i = (c.i + 1) % c.buf.length;
        s += y;
      }
      for (const a of aps) {
        const b = a.buf[a.i];
        a.buf[a.i] = s + b * 0.5;
        a.i = (a.i + 1) % a.buf.length;
        s = b - s;
      }
      out[n] = s;
    }
    return out;
  };
  const wl = run(inL, 0), wr = run(inR, 23);
  for (let n = 0; n < N; n++) { inL[n] += wl[n] * mix * 9; inR[n] += wr[n] * mix * 9; }
}

function writeWav(file, l, r, bits = 24) {
  const bps = bits / 8, data = Buffer.alloc(N * 2 * bps);
  for (let i = 0; i < N; i++) {
    for (const [ch, arr] of [[0, l], [1, r]]) {
      const v = Math.round(clamp(arr[i], -1, 1) * (Math.pow(2, bits - 1) - 1));
      data.writeIntLE(v, (i * 2 + ch) * bps, bps);
    }
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2 * bps, 28); h.writeUInt16LE(2 * bps, 32); h.writeUInt16LE(bits, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

function main() {
  pad();
  paperRustle();
  scanSweep(1);
  tileTicks();
  // heartbeat begins with the scan, 100 bpm, quiet
  for (let t = T.scan[0]; t < T.converge[0] - 0.2; t += 0.6) kick(t, 0.16 + 0.06 * clamp((t - 6) / 4));
  // a bell per block, climbing a D minor pentatonic
  const scale = [62, 65, 67, 69, 72, 74, 77];
  for (let b = 0; b < TL.BLOCKS; b++) bell(TL.blockLanded(b), scale[b], 0.06, (b / (TL.BLOCKS - 1)) * 1.2 - 0.6, 1.3);
  // the pulse running the chain: soft high blips
  for (let k = 0; k < 7; k++) bell(T.pulses[0] + k * ((T.pulses[1] - T.pulses[0]) / 6), 86, 0.018, (k / 6) * 1.4 - 0.7, 0.35, 1.5);
  riser();
  impact(T.converge[1]);

  reverb(L, R);
  // master: DC block, gentle saturation, fade out, true silence at the end
  let pl = 0, pr = 0, ol = 0, or = 0;
  const fadeStart = T.fadeOut[0], fadeEnd = DURATION - 0.05;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    ol = L[i] - pl + 0.9995 * ol; pl = L[i];
    or = R[i] - pr + 0.9995 * or; pr = R[i];
    let g = 1 - clamp((t - fadeStart) / (fadeEnd - fadeStart));
    g = g * g;
    g *= clamp(t / 0.02);
    L[i] = Math.tanh(ol * 1.4) / 1.4 * g;
    R[i] = Math.tanh(or * 1.4) / 1.4 * g;
  }
  let peak = 0;
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const norm = 0.7 / peak;
  for (let i = 0; i < N; i++) { L[i] *= norm; R[i] *= norm; }

  const build = path.join(__dirname, 'build');
  fs.mkdirSync(build, { recursive: true });
  const raw = path.join(build, 'opening-audio-raw.wav');
  const master = path.join(build, 'opening-audio-master.wav');
  writeWav(raw, L, R);

  // two-pass loudness normalisation (EBU R128), podcast target -16 LUFS
  const target = 'I=-16:TP=-1.5:LRA=11';
  const r1 = spawnSync(ffmpeg, ['-hide_banner', '-i', raw, '-af', `loudnorm=${target}:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' });
  const meas = JSON.parse(r1.stderr.slice(r1.stderr.lastIndexOf('{'), r1.stderr.lastIndexOf('}') + 1));
  const pass2 = `loudnorm=${target}:measured_I=${meas.input_i}:measured_TP=${meas.input_tp}:measured_LRA=${meas.input_lra}:measured_thresh=${meas.input_thresh}:offset=${meas.target_offset}:linear=true`;
  execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', raw, '-af', pass2, '-ar', String(SR), '-c:a', 'pcm_s24le', master]);
  console.log('audio: measured', meas.input_i, 'LUFS ->', master);
}

main();
