/* PayPoster — draws the poster on a <canvas>. Original code, MIT (c) 2026 Anish (HEYYANIXX). */
(function (root) {
  'use strict';
  var SIZES = {
    story:  { w: 1080, h: 1920, label: 'Story 9:16' },
    square: { w: 1080, h: 1080, label: 'Square 1:1' },
    a4:     { w: 1240, h: 1754, label: 'A4 print' }
  };
  // Each style: background painter + colours.
  var STYLES = {
    noir: { name: 'Gold Noir', bg: ['#0b0a0d', '#060608'], ink: '#f5ead2', sub: '#b9ad94', accent: '#e3b65a', accent2: '#a5741f', card: '#ffffff', head: 'SCAN & PAY' },
    shop: { name: 'Shop Counter', bg: ['#fffaf0', '#f3ead6'], ink: '#15120c', sub: '#5e5442', accent: '#c9922e', accent2: '#8a5d14', card: '#ffffff', head: 'PAY HERE' },
    chai: { name: 'Chai Support', bg: ['#1a0f08', '#0d0806'], ink: '#fbe9d0', sub: '#c8a98a', accent: '#f0a64a', accent2: '#b5651d', card: '#fff8ef', head: 'BUY ME A CHAI' },
    event:{ name: 'Event Pass', bg: ['#0a0f1f', '#05060c'], ink: '#eef2ff', sub: '#9aa6c7', accent: '#e3b65a', accent2: '#6c7cff', card: '#ffffff', head: 'ENTRY FEE' }
  };
  var FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Devanagari", Arial, sans-serif';
  var MONO = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace';

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fitText(ctx, text, maxW, size, weight, family) {
    var s = size;
    do { ctx.font = weight + ' ' + s + 'px ' + family; if (ctx.measureText(text).width <= maxW) break; s -= 2; } while (s > 12);
    return s;
  }
  function center(ctx, text, x, y) { ctx.textAlign = 'center'; ctx.fillText(text, x, y); }

  function paintBg(ctx, W, H, st, styleKey, k) {
    var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, st.bg[0]); g.addColorStop(1, st.bg[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save();
    if (styleKey === 'shop') {
      // dotted paper + gold border
      ctx.fillStyle = 'rgba(201,146,46,.10)';
      for (var y = 30 * k; y < H; y += 36 * k) for (var x = 30 * k; x < W; x += 36 * k) { ctx.beginPath(); ctx.arc(x, y, 2.2 * k, 0, 7); ctx.fill(); }
      ctx.strokeStyle = st.accent; ctx.lineWidth = 6 * k; rr(ctx, 28 * k, 28 * k, W - 56 * k, H - 56 * k, 34 * k); ctx.stroke();
      ctx.lineWidth = 2 * k; rr(ctx, 44 * k, 44 * k, W - 88 * k, H - 88 * k, 26 * k); ctx.stroke();
    } else if (styleKey === 'event') {
      var rg = ctx.createRadialGradient(W * .85, H * .05, 10, W * .85, H * .05, W * .9);
      rg.addColorStop(0, 'rgba(108,124,255,.35)'); rg.addColorStop(1, 'rgba(108,124,255,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(227,182,90,.18)'; ctx.lineWidth = 2 * k;
      for (var i = -H; i < W; i += 60 * k) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H * .6, H); ctx.stroke(); }
    } else {
      // glow + diagonal streaks
      var rg2 = ctx.createRadialGradient(W / 2, H * .38, 10, W / 2, H * .38, Math.max(W, H) * .7);
      rg2.addColorStop(0, styleKey === 'chai' ? 'rgba(240,166,74,.22)' : 'rgba(227,182,90,.20)'); rg2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg2; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = .07; ctx.fillStyle = st.accent;
      ctx.beginPath(); ctx.moveTo(0, H * .72); ctx.lineTo(W * .72, 0); ctx.lineTo(W * .86, 0); ctx.lineTo(0, H * .86); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(227,182,90,.35)'; ctx.lineWidth = 2 * k; rr(ctx, 30 * k, 30 * k, W - 60 * k, H - 60 * k, 40 * k); ctx.stroke();
    }
    ctx.restore();
  }

  function drawQR(ctx, text, x, y, size, dark) {
    var qr = root.qrcode(0, 'M'); qr.addData(text, 'Byte'); qr.make();
    var n = qr.getModuleCount(), cell = Math.floor(size / n), off = Math.floor((size - cell * n) / 2);
    ctx.fillStyle = dark;
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(x + off + c * cell, y + off + r * cell, cell, cell);
    return n;
  }

  // o: {pa, pn, am, tn, head, style, size, hindi}
  function render(canvas, o, uri) {
    var sz = SIZES[o.size] || SIZES.story, st = STYLES[o.style] || STYLES.noir;
    var W = sz.w, H = sz.h, k = W / 1080;
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    // pass 1 measures the content height, pass 2 draws it vertically centred
    var first = layout(ctx, W, H, k, st, o, uri, 0);
    var square0 = o.size === 'square';
    var avail = H - (square0 ? 130 : 230) * k; // keep clear of the footer
    var top0 = square0 ? 60 * k : 90 * k;
    var shift = Math.max(0, (avail - top0 - first) / 2);
    layout(ctx, W, H, k, st, o, uri, top0 + shift);
    return canvas;
  }

  function layout(ctx, W, H, k, st, o, uri, top) {
    paintBg(ctx, W, H, st, o.style, k);
    var square = o.size === 'square';
    var cx = W / 2, pad = 90 * k;
    // vertical rhythm
    var qrSize = Math.round((square ? 450 : (o.size === 'a4' ? 660 : 680)) * k);
    var blocks = [];
    var head = (o.head || st.head).toUpperCase();
    var hasAmt = !!o.am;
    var y = top;
    // chip
    ctx.font = '700 ' + Math.round(30 * k) + 'px ' + FONT;
    var chip = head, cw = ctx.measureText(chip).width + 70 * k, ch = 64 * k;
    ctx.fillStyle = st.accent; rr(ctx, cx - cw / 2, y, cw, ch, ch / 2); ctx.fill();
    ctx.fillStyle = o.style === 'shop' ? '#ffffff' : '#0b0906'; ctx.textBaseline = 'middle';
    center(ctx, chip, cx, y + ch / 2 + 1 * k);
    y += ch + (square ? 40 : 60) * k;
    // name
    var name = o.pn || 'Your Name';
    ctx.fillStyle = st.ink; ctx.textBaseline = 'alphabetic';
    var ns = fitText(ctx, name, W - pad * 2, Math.round((square ? 70 : 92) * k), '800', FONT);
    y += ns; center(ctx, name, cx, y);
    y += (square ? 50 : 56) * k;
    // QR card
    var cardPad = 50 * k, cardW = qrSize + cardPad * 2;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 50 * k; ctx.shadowOffsetY = 18 * k;
    ctx.fillStyle = st.card; rr(ctx, cx - cardW / 2, y, cardW, cardW, 36 * k); ctx.fill(); ctx.restore();
    ctx.strokeStyle = st.accent; ctx.lineWidth = 5 * k; rr(ctx, cx - cardW / 2, y, cardW, cardW, 36 * k); ctx.stroke();
    // corner ticks
    ctx.strokeStyle = st.accent2; ctx.lineWidth = 8 * k; var t = 46 * k, x0 = cx - cardW / 2 - 18 * k, y0 = y - 18 * k, x1 = cx + cardW / 2 + 18 * k, y1 = y + cardW + 18 * k;
    [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(function (p) {
      ctx.beginPath(); ctx.moveTo(p[0], p[1] + p[3] * t); ctx.lineTo(p[0], p[1]); ctx.lineTo(p[0] + p[2] * t, p[1]); ctx.stroke();
    });
    if (uri) drawQR(ctx, uri, cx - qrSize / 2, y + cardPad, qrSize, '#0a0a0a');
    else { ctx.fillStyle = '#e9e4d8'; ctx.fillRect(cx - qrSize / 2, y + cardPad, qrSize, qrSize); ctx.fillStyle = '#7a705c'; ctx.font = '600 ' + Math.round(34 * k) + 'px ' + FONT; ctx.textBaseline = 'middle'; center(ctx, 'Enter your UPI ID', cx, y + cardW / 2); ctx.textBaseline = 'alphabetic'; }
    y += cardW + (square ? 60 : 92) * k;
    // amount
    var amtText = hasAmt ? root.PPUpi.formatINR(o.am) : 'Any amount';
    ctx.fillStyle = hasAmt ? st.accent : st.sub;
    var as = fitText(ctx, amtText, W - pad * 2, Math.round((hasAmt ? (square ? 76 : 104) : (square ? 46 : 58)) * k), '800', FONT);
    center(ctx, amtText, cx, y); y += (square ? 46 : 64) * k;
    // upi id
    if (o.pa) { ctx.fillStyle = st.ink; fitText(ctx, o.pa, W - pad * 2, Math.round((square ? 30 : 38) * k), '600', MONO); center(ctx, o.pa, cx, y); y += (square ? 42 : 58) * k; }
    if (o.tn && !square) { ctx.fillStyle = st.sub; fitText(ctx, o.tn, W - pad * 2, Math.round(34 * k), '500', FONT); center(ctx, '\u201C' + o.tn + '\u201D', cx, y); y += 56 * k; }
    // footer
    var contentH = y - top;
    var fy = H - (square ? 70 : 120) * k;
    ctx.fillStyle = st.sub; ctx.font = '600 ' + Math.round((square ? 26 : 32) * k) + 'px ' + FONT;
    center(ctx, o.hindi ? '\u0915\u093F\u0938\u0940 \u092D\u0940 UPI \u0910\u092A \u0938\u0947 \u0938\u094D\u0915\u0948\u0928 \u0915\u0930\u0947\u0902' : 'Scan with any UPI app', cx, fy);
    ctx.globalAlpha = .55; ctx.font = '500 ' + Math.round(22 * k) + 'px ' + FONT;
    center(ctx, 'made with PayPoster \u00B7 heyyanixx', cx, fy + 40 * k); ctx.globalAlpha = 1;
    return contentH;
  }

  root.PPPoster = { render: render, SIZES: SIZES, STYLES: STYLES, drawQR: drawQR };
})(window);
