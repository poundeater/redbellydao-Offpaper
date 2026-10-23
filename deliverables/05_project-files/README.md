# Project files

- **Complete source project:** `../../source/`. These are the Node.js build scripts that produce every deliverable, plus the brand assets they use. See the main README, section "Rebuilding from source".
- **`audio/offpaper-opening-score-master-48k24.wav`**: the opening score as a mastered stem (48 kHz, 24-bit, stereo, -16 LUFS). Use it to re-cut the opening in DaVinci Resolve, Premiere or another editor. A spectrogram and waveform of it are included.
- **`review-stills/landscape/` and `review-stills/vertical/`**: full-resolution frames at key moments (1.5 s to 17.9 s) from both formats, for review without playing the video.

To change the opening, edit `source/lib/timeline.js` (timing) or `source/render-video.js` (picture), then run `npm run build:audio && npm run build:video`.
