# Making a new episode thumbnail

There are two ways to make one. Both are free, and neither needs design experience.

## Option 1: Thumbnail maker (recommended, about 1 minute)

1. Open `deliverables/03_thumbnails/editable-template/offpaper-thumbnail-maker.html` in Chrome, Edge, Firefox or Safari. Double-clicking the file works. It runs offline with no account, and fonts and logo are built in.
2. Fill in the four fields:
   - **Episode number**: type `30` and it shows as "EP 30". A word such as `Special` shows in capitals.
   - **Episode title**: 45 characters or fewer reads best on a phone. The size adjusts itself to fit up to 3 lines. If the title is too long, an orange warning appears and you should shorten it.
   - **Guest name** and **Guest role / organisation**.
3. **Guest photo**: choose a headshot the guest supplied or approved. The 30% Slate overlay and tile pattern are added automatically. Use the two sliders to move the face into the frame.
4. Check the small **phone feed size** preview. If the title reads there, it will read on YouTube and Spotify.
5. Click **Download 1920 x 1080 PNG** (YouTube) or **1280 x 720 PNG**.

Colours, fonts, the show name and the Tokeniser logo are fixed in the maker, so a thumbnail made with it cannot go off-brand.

## Option 2: Figma (free plan), Penpot or Inkscape

1. In Figma, create a design file, then drag `offpaper-thumbnail-template.svg` onto the canvas (or use **File > Import**). In Penpot or Inkscape, open the SVG directly.
2. The layers are named by what you may change:
   - `EDIT - Episode number`: double-click the text "EP 30" to change it.
   - `EDIT - Episode title (max 3 lines, ~16 characters per line)`: edit the three lines. Keep the 112 px size, or go down to 84 px for long titles.
   - `EDIT - Guest name` and `EDIT - Guest role`.
   - `EDIT - Guest photo (replace image fill)`: select the image inside it, then in Figma use **Fill > Image > Choose image**, or drag a photo onto it. Keep the 30% Slate overlay above it.
   - Layers marked `LOCKED` (background, Folio mark, show name, ledger field, tile cascade, rules, Tokeniser logo) stay as they are. In Figma, select them and press **Shift + Ctrl/Cmd + L** to lock them.
3. Montserrat is built into Figma (Google Fonts). If another tool asks for it, it is in `source/assets/`.
4. Export the frame as PNG at 1x (1920 x 1080).

## Rules to keep

- The show name reads exactly **Off Paper - Powered by Tokeniser**. It is already on the template, so leave it as it is.
- Use only the Tokeniser logo already placed on the template. Do not stretch, recolour or replace it.
- One guest photo per thumbnail. Make sure you have the guest's permission to use it.
- Titles in sentence case or title case, never all capitals, and no emoji, price talk or hype words.
