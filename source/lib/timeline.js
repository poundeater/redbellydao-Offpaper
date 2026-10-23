// Single timeline shared by picture and sound, so every hit lands on its frame.
const FPS = 30;
const DURATION = 18;

const SHEET = { cols: 14, rows: 18 };      // 252 tiles = 7 blocks of 6 x 6
const BLOCKS = 7;
const BLOCK_N = 6;

const T = {
  paperIn: [0.5, 2.4],      // the document rises out of the dark
  lightSweep: [1.3, 3.0],   // a band of light reads across it
  scan: [3.0, 5.6],         // scan line converts paper to tiles
  scanJitter: 0.25,
  travelStart: 6.0,         // first block starts assembling
  blockStagger: 0.32,
  cellStagger: 0.35,
  travelDur: 1.5,
  linkDur: 0.35,
  pulses: [9.95, 10.85],    // light runs the length of the chain
  converge: [10.9, 12.7],   // the chain folds into the Folio mark
  nameIn: [12.55, 13.5],
  tailIn: [12.95, 13.8],
  logoIn: [13.35, 14.2],
  fadeOut: [16.6, 17.6]     // fade to solid Slate, clean cut-in point
};

function blockLanded(b) {
  return T.travelStart + b * T.blockStagger + T.cellStagger + T.travelDur;
}

function linkDrawn(i) { // link between block i and i+1
  return blockLanded(i + 1) + 0.05;
}

module.exports = { FPS, DURATION, SHEET, BLOCKS, BLOCK_N, T, blockLanded, linkDrawn };
