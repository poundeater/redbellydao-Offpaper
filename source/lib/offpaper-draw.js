/*
 * Off Paper - Powered by Tokeniser
 * Shared drawing primitives. Runs unchanged in Node (@napi-rs/canvas)
 * and in the browser (thumbnail maker), so every output uses one source
 * of truth for colour, type and the graphic devices.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OffPaper = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Tokeniser palette - the only colours used anywhere in the identity.
  var C = {
    slate: '#343740',
    mint: '#A2FFC8',
    lightMint: '#DAFDE5',
    lightBlue: '#C9DBF1',
    blue: '#323B70',
    teal: '#009C9C',
    orange: '#FF9A81'
  };

  // Tokeniser opacity rules for graphic devices and photography.
  var RULES = {
    deviceOnSolid: 0.7,
    deviceOnPhoto: 0.6,
    photoSlateOverlay: 0.3
  };

  var SHOW_NAME = 'Off Paper - Powered by Tokeniser';
  var NAME_HEAD = 'Off Paper';
  var NAME_TAIL = '- Powered by Tokeniser';

  function font(weight, px) {
    return weight + ' ' + px + 'px Montserrat';
  }

  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function mixHex(h1, h2, t) {
    var a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
    var r = Math.round((a >> 16) + ((b >> 16) - (a >> 16)) * t);
    var g = Math.round(((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t);
    var bl = Math.round((a & 255) + ((b & 255) - (a & 255)) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }

  function roundedRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  /*
   * THE FOLIO MARK - the show's emblem.
   * A 6 x 6 grid of tiles: a sheet of paper that has already become a
   * set of discrete units. The top-right corner (where a page curls)
   * has lifted away from the sheet, mid-transition onto the chain.
   */
  var FOLIO_N = 6;
  function folioCells() {
    var cells = [];
    for (var r = 0; r < FOLIO_N; r++) {
      for (var c = 0; c < FOLIO_N; c++) {
        var lifted = c - r >= 3;
        cells.push({ r: r, c: c, lifted: lifted, depth: lifted ? (c - r - 2) : 0 });
      }
    }
    return cells;
  }

  // Positions (in units of the full mark size) for each Folio tile.
  function folioLayout(size) {
    var pitch = size / FOLIO_N;
    var tile = pitch * 0.82;
    return folioCells().map(function (cell) {
      var lift = cell.lifted ? pitch * (0.16 + 0.14 * cell.depth) : 0;
      return {
        cell: cell,
        x: cell.c * pitch + (pitch - tile) / 2 + lift,
        y: cell.r * pitch + (pitch - tile) / 2 - lift,
        s: tile
      };
    });
  }

  function drawFolio(ctx, x, y, size, opts) {
    opts = opts || {};
    var alpha = opts.alpha == null ? RULES.deviceOnSolid : opts.alpha;
    var base = opts.base || C.mint;
    var lift = opts.lift || C.lightMint;
    ctx.save();
    ctx.globalAlpha = alpha;
    folioLayout(size).forEach(function (t) {
      ctx.fillStyle = t.cell.lifted ? lift : base;
      roundedRect(ctx, x + t.x, y + t.y, t.s, t.s, t.s * 0.12);
      ctx.fill();
    });
    ctx.restore();
  }

  /*
   * LEDGER FIELD - a dot lattice used as background texture.
   * Every point is a potential entry; a few are filled to suggest records.
   */
  function drawLedgerField(ctx, x, y, w, h, pitch, opts) {
    opts = opts || {};
    var color = opts.color || C.lightBlue;
    var alpha = opts.alpha == null ? RULES.deviceOnSolid : opts.alpha;
    var r = opts.radius || Math.max(1, pitch * 0.045);
    ctx.save();
    ctx.globalAlpha = alpha * (opts.strength == null ? 0.22 : opts.strength);
    ctx.fillStyle = color;
    for (var py = y + pitch / 2; py < y + h; py += pitch) {
      for (var px = x + pitch / 2; px < x + w; px += pitch) {
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /*
   * CHAIN LINK - a hairline with nodes, the connective device.
   */
  function drawChainLink(ctx, x1, y1, x2, y2, opts) {
    opts = opts || {};
    var alpha = opts.alpha == null ? RULES.deviceOnSolid : opts.alpha;
    var w = opts.width || 3;
    var nodes = opts.nodes || 3;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = opts.color || C.mint;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.fillStyle = opts.nodeColor || opts.color || C.mint;
    for (var i = 0; i <= nodes; i++) {
      var t = nodes === 0 ? 0 : i / nodes;
      ctx.beginPath();
      ctx.arc(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, w * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /*
   * TILE CASCADE - loose tiles drifting off an edge, used where the
   * identity meets a photo or the edge of a frame.
   */
  function drawCascade(ctx, x, y, pitch, cols, rows, opts) {
    opts = opts || {};
    var alpha = opts.alpha == null ? RULES.deviceOnSolid : opts.alpha;
    var dir = opts.dir || 1;
    ctx.save();
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        // deterministic sparse pattern that thins out with distance
        var k = (c + 1) / cols;
        var h = Math.abs(Math.sin((r * 12.9898 + c * 78.233) * 43758.5453)) % 1;
        if (h > 1 - k * 0.85) continue;
        var s = pitch * (0.82 - 0.4 * k);
        ctx.globalAlpha = alpha * (1 - k * 0.55);
        ctx.fillStyle = (h < 0.18) ? (opts.accent || C.lightMint) : (opts.color || C.mint);
        var px = x + dir * c * pitch + (pitch - s) / 2;
        var py = y + r * pitch + (pitch - s) / 2;
        roundedRect(ctx, dir > 0 ? px : px - s, py, s, s, s * 0.12);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /*
   * Show name lockups. The name is always the exact string
   * "Off Paper - Powered by Tokeniser".
   *   stacked: "Off Paper" on line one, "- Powered by Tokeniser" on line two
   *   inline : the full name on one baseline
   */
  function drawNameStacked(ctx, x, y, headPx, opts) {
    opts = opts || {};
    var align = opts.align || 'left';
    var tailPx = Math.round(headPx * 0.34);
    ctx.save();
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = opts.head || C.lightMint;
    ctx.font = font(800, headPx);
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = (-headPx * 0.02) + 'px';
    ctx.fillText(NAME_HEAD, x, y);
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = (tailPx * 0.01) + 'px';
    ctx.fillStyle = opts.tail || C.mint;
    ctx.font = font(500, tailPx);
    ctx.fillText(NAME_TAIL, x + (align === 'left' ? headPx * 0.04 : 0), y + tailPx * 1.55);
    ctx.restore();
    return { height: headPx * 0.72 + tailPx * 1.55, tailPx: tailPx };
  }

  function measureNameStacked(ctx, headPx) {
    ctx.save();
    ctx.font = font(800, headPx);
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = (-headPx * 0.02) + 'px';
    var w1 = ctx.measureText(NAME_HEAD).width;
    var tailPx = Math.round(headPx * 0.34);
    ctx.font = font(500, tailPx);
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = (tailPx * 0.01) + 'px';
    var w2 = ctx.measureText(NAME_TAIL).width + headPx * 0.04;
    ctx.restore();
    return Math.max(w1, w2);
  }

  function drawNameInline(ctx, x, y, px, opts) {
    opts = opts || {};
    ctx.save();
    ctx.textBaseline = opts.baseline || 'alphabetic';
    ctx.textAlign = 'left';
    ctx.font = font(800, px);
    ctx.fillStyle = opts.head || C.lightMint;
    ctx.fillText(NAME_HEAD, x, y);
    var w = ctx.measureText(NAME_HEAD + ' ').width;
    ctx.font = font(500, px);
    ctx.fillStyle = opts.tail || C.mint;
    ctx.fillText(NAME_TAIL, x + w, y);
    var total = w + ctx.measureText(NAME_TAIL).width;
    ctx.restore();
    return total;
  }

  // Draws a supplied logo PNG scaled uniformly (never stretched, recoloured
  // or redrawn). `box` is the visible artwork area inside the PNG, so the
  // transparent padding in the supplied file does not throw off alignment.
  function drawLogo(ctx, img, box, x, y, height, alpha) {
    var s = height / box.h;
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, box.x, box.y, box.w, box.h, x, y, box.w * s, height);
    ctx.restore();
    return box.w * s;
  }

  // Cover-fit an image into a rectangle (centre crop), like CSS object-fit.
  function drawCover(ctx, img, x, y, w, h, focusX, focusY) {
    var iw = img.width, ih = img.height;
    var s = Math.max(w / iw, h / ih);
    var sw = w / s, sh = h / s;
    var fx = focusX == null ? 0.5 : focusX, fy = focusY == null ? 0.5 : focusY;
    var sx = Math.max(0, Math.min(iw - sw, iw * fx - sw / 2));
    var sy = Math.max(0, Math.min(ih - sh, ih * fy - sh / 2));
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  // Word-wrap text to a width, shrinking the size until it fits maxLines.
  function fitText(ctx, text, weight, maxPx, minPx, width, maxLines, lineHeight) {
    var words = String(text || '').trim().split(/\s+/).filter(Boolean);
    for (var px = maxPx; px >= minPx; px -= 2) {
      ctx.font = font(weight, px);
      var lines = [], line = '';
      var ok = true;
      for (var i = 0; i < words.length; i++) {
        var test = line ? line + ' ' + words[i] : words[i];
        if (ctx.measureText(test).width <= width) line = test;
        else {
          if (!line) { ok = false; break; }
          lines.push(line);
          line = words[i];
          if (ctx.measureText(line).width > width) { ok = false; break; }
        }
      }
      if (line) lines.push(line);
      if (ok && lines.length <= maxLines) return { px: px, lines: lines, lh: px * lineHeight };
    }
    ctx.font = font(weight, minPx);
    return { px: minPx, lines: wrapHard(ctx, words, width, maxLines), lh: minPx * lineHeight, overflow: true };
  }

  function wrapHard(ctx, words, width, maxLines) {
    var lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width <= width || !line) line = test;
      else { lines.push(line); line = words[i]; }
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
    }
    return lines;
  }

  /*
   * EPISODE THUMBNAIL - 16:9, laid out on a 1920 x 1080 grid.
   * data:   { episode, title, guest, role, photoFocusX, photoFocusY }
   * assets: { logo, logoBox, photo }
   * Draws at any output size via `scale`.
   */
  var THUMB = { W: 1920, H: 1080, margin: 96, photoX: 1060 };

  function drawThumbnail(ctx, data, assets, scale) {
    scale = scale || 1;
    var W = THUMB.W, H = THUMB.H, M = THUMB.margin, PX = THUMB.photoX;
    ctx.save();
    ctx.scale(scale, scale);

    // 1. solid ground
    ctx.fillStyle = C.slate;
    ctx.fillRect(0, 0, W, H);
    drawLedgerField(ctx, 0, 0, PX, H, 48, { strength: 0.16 });

    // 2. guest photo, right panel, with the 30% Slate overlay rule
    ctx.save();
    ctx.beginPath();
    ctx.rect(PX, 0, W - PX, H);
    ctx.clip();
    if (assets.photo) {
      drawCover(ctx, assets.photo, PX, 0, W - PX, H, data.photoFocusX, data.photoFocusY);
    } else {
      ctx.fillStyle = C.blue;
      ctx.fillRect(PX, 0, W - PX, H);
    }
    ctx.fillStyle = rgba(C.slate, RULES.photoSlateOverlay);
    ctx.fillRect(PX, 0, W - PX, H);
    // soften the seam into the solid panel (Slate only)
    var seam = ctx.createLinearGradient(PX, 0, PX + 260, 0);
    seam.addColorStop(0, rgba(C.slate, 1));
    seam.addColorStop(1, rgba(C.slate, 0));
    ctx.fillStyle = seam;
    ctx.fillRect(PX, 0, 260, H);
    // tiles leaving the page across the photo: device on photo = 60%
    drawCascade(ctx, PX - 8, H - 7 * 44 - 40, 44, 7, 7, { alpha: RULES.deviceOnPhoto });
    ctx.restore();

    // 3. show lockup, top left: Folio mark + inline name
    drawFolio(ctx, M, 78, 76);
    drawNameInline(ctx, M + 76 + 26, 78 + 38 + 12, 33, {});

    // 4. episode number chip
    var ep = String(data.episode == null ? '' : data.episode).trim();
    var chipY = 236;
    var titleTop = chipY;
    if (ep) {
      ctx.font = font(800, 40);
      var label = /^\d+$/.test(ep) ? 'EP ' + ep : ep.toUpperCase();
      if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '3px';
      var cw = ctx.measureText(label).width + 52;
      ctx.fillStyle = C.mint;
      roundedRect(ctx, M, chipY, cw, 68, 10);
      ctx.fill();
      ctx.fillStyle = C.slate;
      ctx.textBaseline = 'middle';
      ctx.fillText(label, M + 26, chipY + 36);
      if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
      titleTop = chipY + 68 + 44;
    }

    // 5. title - large, auto-fitted, max 3 lines (phone legibility)
    var titleW = PX - M - 40;
    var titleBottom = H - M - (data.role ? 62 : 0) - 56 - 70;
    var fit = fitText(ctx, data.title, 800, 132, 84, titleW, 3, 1.04);
    while (fit.px > 84 && titleTop + fit.px * 0.8 + (fit.lines.length - 1) * fit.lh > titleBottom) {
      fit = fitText(ctx, data.title, 800, fit.px - 4, 84, titleW, 3, 1.04);
    }
    ctx.font = font(800, fit.px);
    ctx.fillStyle = C.lightMint;
    ctx.textBaseline = 'alphabetic';
    var ty = titleTop + fit.px * 0.80;
    fit.lines.forEach(function (ln, i) { ctx.fillText(ln, M - fit.px * 0.03, ty + i * fit.lh); });
        // 6. guest name + role, anchored to the bottom of the text column
    var roleY = H - M - 4;
    var nameY = data.role ? roleY - 62 : roleY;
    var guestFit = fitText(ctx, data.guest, 700, 56, 40, titleW, 1, 1.1);
    ctx.font = font(700, guestFit.px);
    ctx.fillStyle = C.mint;
    ctx.fillText(guestFit.lines[0] || '', M, nameY);
    if (data.role) {
      var roleFit = fitText(ctx, data.role, 500, 38, 28, titleW, 1, 1.1);
      ctx.font = font(500, roleFit.px);
      ctx.fillStyle = C.lightBlue;
      ctx.fillText(roleFit.lines[0] || '', M, roleY);
    }
    ctx.save();
    ctx.globalAlpha = RULES.deviceOnSolid;
    ctx.fillStyle = C.teal;
    ctx.fillRect(M, nameY - guestFit.px - 30, 88, 5);
    ctx.restore();

    // 7. Tokeniser logo, bottom right over the photo, as supplied
    if (assets.logo) {
      var lh = 52;
      var lw = assets.logoBox.w * lh / assets.logoBox.h;
      drawLogo(ctx, assets.logo, assets.logoBox, W - M + 24 - lw, H - M + 8 - lh, lh);
    }

    ctx.restore();
  }

  return {
    C: C, RULES: RULES, SHOW_NAME: SHOW_NAME, NAME_HEAD: NAME_HEAD, NAME_TAIL: NAME_TAIL,
    font: font, rgba: rgba, mixHex: mixHex, roundedRect: roundedRect,
    folioCells: folioCells, folioLayout: folioLayout, drawFolio: drawFolio,
    drawLedgerField: drawLedgerField, drawChainLink: drawChainLink, drawCascade: drawCascade,
    drawNameStacked: drawNameStacked, measureNameStacked: measureNameStacked, drawNameInline: drawNameInline,
    drawLogo: drawLogo, drawCover: drawCover, fitText: fitText,
    THUMB: THUMB, drawThumbnail: drawThumbnail
  };
});
