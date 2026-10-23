# Off Paper - Powered by Tokeniser

The visual identity, cover art, episode thumbnail template and opening sequence for the relaunch of Redbelly Insights as **Off Paper - Powered by Tokeniser**.

Everything here comes from one system: the Tokeniser palette, Montserrat, the three supplied Tokeniser logo files, and one shared drawing library ([source/lib/offpaper-draw.js](source/lib/offpaper-draw.js)). The cover, the thumbnails, the thumbnail maker and every frame of the opening are drawn by that same code, so all of them look like the same show.

---

## Deliverables

| # | Brief item | File(s) |
|---|---|---|
| 1 | Identity sheet (PDF + image) | [deliverables/01_identity/offpaper-identity-sheet.pdf](deliverables/01_identity/offpaper-identity-sheet.pdf), [.png](deliverables/01_identity/offpaper-identity-sheet.png) (A4 landscape, 3508 x 2480, 300 dpi) |
| 2 | Show cover art, square | [offpaper-cover-3000.png](deliverables/02_cover-art/offpaper-cover-3000.png) (3000 x 3000), [offpaper-cover-1400.jpg](deliverables/02_cover-art/offpaper-cover-1400.jpg) (1400 x 1400, for directories that cap file size) |
| 3a | Editable thumbnail template (free tools) | [offpaper-thumbnail-maker.html](deliverables/03_thumbnails/editable-template/offpaper-thumbnail-maker.html) (opens in any web browser, works offline) and [offpaper-thumbnail-template.svg](deliverables/03_thumbnails/editable-template/offpaper-thumbnail-template.svg) (layered file for **Figma** (free plan), Penpot or Inkscape). How to use: [docs/THUMBNAIL-GUIDE.md](docs/THUMBNAIL-GUIDE.md) |
| 3b | 3 finished thumbnails, 16:9, at least 1280 x 720 | [deliverables/03_thumbnails/examples/](deliverables/03_thumbnails/examples/): EP 29, EP 28, EP 27, each at 1920 x 1080 and 1280 x 720. Also: [phone-size proofs](deliverables/03_thumbnails/phone-size-proof/) at 360 px wide and a [long-title stress test](deliverables/03_thumbnails/extra-long-title-test/) |
| 4 | Opening sequence, landscape + vertical, with audio | [offpaper-opening-16x9-1920x1080.mp4](deliverables/04_opening-sequence/offpaper-opening-16x9-1920x1080.mp4), [offpaper-opening-9x16-1080x1920.mp4](deliverables/04_opening-sequence/offpaper-opening-9x16-1080x1920.mp4) |
| 5 | Project files | [source/](source/): the complete build (Node.js). Plus [deliverables/05_project-files/](deliverables/05_project-files/): the master score as 48 kHz / 24-bit WAV, its spectrogram and waveform, and review stills from both video formats |
| 6 | Licence proof | [deliverables/06_licences/LICENCES.md](deliverables/06_licences/LICENCES.md) and the Montserrat OFL text |
| - | Verification | [docs/VERIFICATION.md](docs/VERIFICATION.md): 49 automated checks against the brief, all passing |

### Opening sequence specs

| | Landscape | Vertical |
|---|---|---|
| Resolution | 1920 x 1080 (16:9) | 1080 x 1920 (9:16) |
| Frame rate | 30 fps, progressive | 30 fps, progressive |
| Duration | 18.0 s | 18.0 s |
| Video | H.264 High, yuv420p, BT.709 tagged | same |
| Audio | AAC-LC 320 kb/s, 48 kHz stereo | same |
| Loudness | -15.9 LUFS integrated, -1.4 dBFS true peak (podcast target -16 LUFS) | same |
| Ending | fades to solid Slate #343740 by 17.6 s and holds, so an episode can cut straight in | same |

---

## Part A: the identity

### Idea: the Folio mark
*Off Paper* means an asset leaving its paper record and living on chain. The show's mark is a **6 x 6 grid of tiles**: a sheet of paper that has already become discrete units. Its top-right corner, where a page curls, has lifted away from the sheet, partway into the move on chain. It is built from squares and spacing only, so it sits easily next to the Tokeniser wordmark and never competes with it.

### Colour (Tokeniser palette only)
| Role | Colour | Hex | Share |
|---|---|---|---|
| Ground | Slate | `#343740` | ~60% |
| Signal, devices | Mint | `#A2FFC8` | ~20% |
| Type, paper | Light Mint | `#DAFDE5` | ~10% |
| Secondary text | Light Blue | `#C9DBF1` | secondary |
| Depth, light | Blue | `#323B70` | secondary |
| Rules, links | Teal | `#009C9C` | secondary |
| Rare accent | Orange | `#FF9A81` | secondary, used sparingly |

No colour outside this list is used anywhere. The only blending is a palette colour laid over Slate at reduced opacity. `verify.js` scans every source file and fails the build on any other hex value.

### Type: Montserrat only
- ExtraBold 800: show name, episode titles
- Bold 700: guest names, headings
- Medium 500: the "- Powered by Tokeniser" line, roles, body
- Regular 400: long-form copy

### The show name
It always reads **Off Paper - Powered by Tokeniser**: hyphen-minus, one space either side.
- **Stacked lockup** (cover, opening): "Off Paper" in ExtraBold Light Mint, with "- Powered by Tokeniser" in Medium Mint on the line below. The break falls after "Paper" and the hyphen starts line two, so the words and their order never change.
- **Inline lockup** (thumbnails, small sizes): the full name on one line. "Off Paper" is ExtraBold and the rest is Medium.

### Tokeniser logo
- Only the three supplied PNGs are used, byte for byte (MD5 checked in `verify.js`): **on-dark** for Slate and photos, **slate-green** for Light Mint, **on-mint** square used whole.
- They are only ever scaled proportionally. Layout aligns to the artwork's visible bounds, and the files are never cropped, recoloured, outlined or redrawn.
- Clear space is half the logo height on every side. Minimum size is 24 px (or 6 mm) logo height.
- The logo sits apart from the show name, never inside it: below the lockup on the cover and in the opening, and bottom right on thumbnails.

### Graphic devices and the Tokeniser opacity rules
| Device | Use |
|---|---|
| Folio mark | show emblem: cover, thumbnails, the end of the opening |
| Ledger field | dot lattice texture on solid grounds |
| Chain link | hairline with nodes, a rule and a connector |
| Tile cascade | tiles drifting off an edge, where the identity meets a photo |

- On solid colour, devices sit at **70%** opacity (`RULES.deviceOnSolid = 0.7`).
- On photos, devices sit at **60%** (`RULES.deviceOnPhoto = 0.6`).
- Every photo carries a **30% Slate overlay** (`RULES.photoSlateOverlay = 0.3`).

These three values live in one place, [offpaper-draw.js](source/lib/offpaper-draw.js), and every output reads them from there.

### Tone
Institutional and calm: one dark ground, a single accent colour, generous margins, and movement that is slow and precise. There are no rockets, charts or price talk, and nothing cartoonish.

---

## Part B: cover and thumbnails

**Cover:** the Folio mark at hero scale on Slate, with a faint outline of the original folded sheet behind it and a few tiles drifting up and away. Below it sit the stacked name, a Teal chain-link rule and the on-dark Tokeniser logo.

**Thumbnail system (16:9, on a 1920 x 1080 grid):**
- Left column: the Folio mark with the inline show name, an episode chip ("EP 29"), then the title in ExtraBold. The title fits itself between 132 px and 84 px across up to 3 lines. Below it sit the guest name in Bold Mint and the role in Medium Light Blue.
- Right panel: the guest photo with its 30% Slate overlay, a Slate fade into the text column, a tile cascade at 60%, and the Tokeniser logo.
- On a phone (360 px wide) the title cap height is about 11 to 17 px. See [the phone proofs](deliverables/03_thumbnails/phone-size-proof/).

**Stand-in content.** The examples use episode numbers, guests and organisations from past Redbelly Insights episodes listed at https://redbelly.network/ama:
| Example | Guest | Organisation |
|---|---|---|
| EP 29 "The AUDD Stablecoin Story" | Effie Dimitropoulos | AUDD Stablecoin |
| EP 28 "Inside Redbelly Network" | Vincent Gramoli | Redbelly Network |
| EP 27 "In Conversation: Macropod" | Drew Bradford | Macropod |

The original episodes are titled only "Redbelly Insights - Episode N", so each headline is a working title built from the guest's organisation. The long-title test uses a real past title: "How AMAL/IQ-EQ and Redbelly Are Modernizing Asset Lifecycles", from the CoinTelegraph Podcast with Alan Burt and Luke Andersen.

**Guest photos.** The example portraits are licence-safe placeholders made for this project in code: lit silhouettes in palette colours, not stock and not pictures of the real guests. For real episodes, use a headshot the guest has supplied or approved.

---

## Part C: the opening sequence

Abstract, 18 seconds, no words except the show name and logo at the end.

| Time | Picture | Sound |
|---|---|---|
| 0.0-2.4 s | Out of solid Slate, a document (border, heading bar, ruled lines, a seal, a signature flourish; no legible text) rises toward camera | warm Dm9 pad opens, soft paper rustle |
| 1.3-3.0 s | a band of light reads across the page | pad brightens |
| 3.0-5.9 s | a Mint scan line crosses the sheet; behind it the page splits into tiles that lift and turn over to their Mint token side | filtered shimmer follows the scan; tiny glass ticks; a 100 bpm heartbeat begins |
| 6.0-9.8 s | tiles leave the page in the order they were released and assemble into 7 blocks of 6 x 6, which lock one by one and link with Teal hairlines | the chord moves to Bbmaj7; one bell per block, climbing D minor pentatonic |
| 9.9-10.9 s | a pulse of light runs the length of the chain | soft high blips follow it |
| 10.9-12.7 s | the chain folds into a single block, the Folio mark, and its corner lifts | Csus2 lift, noise riser |
| 12.7-14.2 s | the mark settles with a soft bloom; "Off Paper", then "- Powered by Tokeniser", then the Tokeniser logo come in | low impact, a chord of bells, resolve to Dm(add9) |
| 14.2-16.6 s | clean hold | tail decays |
| 16.6-18.0 s | fade to solid Slate | fade to silence |

**Vertical is laid out for its format, not cropped.** The sheet is larger and the chain runs vertically down the frame. The end lockup stacks the mark, then the name, then the logo, all centred. Landscape sets the mark to the left of the name.

**Sound.** All sound is synthesised in [source/audio.js](source/audio.js) from oscillators, filtered noise and a hand-written reverb. No samples, loops or stock audio are used, and there is no voice. Loudness is normalised in two passes to EBU R128 (-16 LUFS, -1.5 dBTP). Picture and sound share one timeline ([source/lib/timeline.js](source/lib/timeline.js)), so every bell lands on the frame where its block locks.

**Text sharpness.** Type is drawn at native resolution in screen space, never scaled through the 3D projection. The H.264 encode is CRF 17, capped at 14 Mb/s with a 1 s GOP and BT.709 tags.

---

## Rebuilding from source

Requires Node.js 18 or later (built on Node 24). Everything else installs from npm, including a static ffmpeg build.

```bash
cd source
npm install
npm run build
npm run verify
```

`npm run build` regenerates every deliverable: cover, thumbnails, templates, audio, review stills, identity sheet and both videos (about 3 minutes per video on a laptop). `npm run verify` writes [docs/VERIFICATION.md](docs/VERIFICATION.md) and exits non-zero if any check fails.

| File | Purpose |
|---|---|
| `lib/offpaper-draw.js` | palette, opacity rules, name lockups, Folio mark and devices, thumbnail layout. The same file runs in Node and in the browser maker |
| `lib/node-brand.js` | font registration, logo loading and artwork bounds, grain, placeholder portraits |
| `lib/timeline.js` | shared picture and sound timeline |
| `build-cover-thumbs.js` | cover art and example thumbnails |
| `build-templates.js` | HTML thumbnail maker and layered SVG template |
| `build-identity.js` | identity sheet PNG and PDF |
| `audio.js` | original score and sound design, loudness mastering |
| `render-video.js` | 2.5D renderer for the opening, both formats, piped straight to ffmpeg |
| `verify.js` | automated checks against the brief |
| `episodes.json` | stand-in thumbnail content |
| `assets/` | the supplied Tokeniser logos (unaltered) and Montserrat TTFs with their OFL |
