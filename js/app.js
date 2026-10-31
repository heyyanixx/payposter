/* PayPoster — UI wiring. Original code, MIT (c) 2026 Anish (HEYYANIXX). */
(function () {
  'use strict';
  var U = window.PPUpi, PP = window.PPPoster;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'payposter:v1';
  var state = { pa: '', pn: '', am: '', tn: '', head: '', style: 'noir', size: 'story', hindi: false };
  var lastUri = '';

  function toast(t) { var el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('show'); }, 1800); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') Object.keys(state).forEach(function (k) { if (k in s) state[k] = s[k]; }); } catch (e) {} }

  function chips(boxId, map, key, labelOf, swatch) {
    var box = $(boxId); box.innerHTML = '';
    Object.keys(map).forEach(function (k) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.dataset.k = k;
      b.setAttribute('aria-pressed', String(state[key] === k));
      if (swatch) { var s = document.createElement('span'); s.className = 'sw'; s.style.background = 'linear-gradient(135deg,' + map[k].bg[0] + ' 50%,' + map[k].accent + ' 50%)'; b.appendChild(s); }
      b.appendChild(document.createTextNode(labelOf(map[k])));
      b.addEventListener('click', function () { state[key] = k; Array.prototype.forEach.call(box.children, function (c) { c.setAttribute('aria-pressed', String(c.dataset.k === k)); }); update(); });
      box.appendChild(b);
    });
  }

  function pageBase() { return location.href.split('#')[0]; }

  function update() {
    var v = U.validateVpa(state.pa), a = U.normalizeAmount(state.am);
    var paMsg = $('pa-msg'), amMsg = $('am-msg');
    if (state.pa && !v.ok) { paMsg.textContent = v.msg; paMsg.className = 'msg'; $('pa').classList.add('bad'); }
    else { paMsg.textContent = v.ok ? '✓ Looks good' : ''; paMsg.className = 'msg ok'; $('pa').classList.remove('bad'); }
    if (!a.ok) { amMsg.textContent = a.msg; $('am').classList.add('bad'); } else { amMsg.textContent = ''; $('am').classList.remove('bad'); }
    var ready = v.ok && a.ok;
    lastUri = ready ? U.buildUpiUri({ pa: state.pa, pn: state.pn, am: state.am, tn: state.tn }) : '';
    var opts = { pa: v.ok ? v.value : '', pn: state.pn.trim(), am: a.ok ? a.value : '', tn: state.tn.trim(), head: state.head.trim(), style: state.style, size: state.size, hindi: state.hindi };
    PP.render($('poster'), opts, lastUri);
    var link = ready ? U.buildPayPageUrl(pageBase(), state) : '';
    $('paylink').value = link || 'Enter a valid UPI ID to get your link';
    ['dl', 'share', 'print', 'copy', 'copy-upi'].forEach(function (id) { $(id).disabled = !ready; });
    $('wa').href = ready ? 'https://wa.me/?text=' + encodeURIComponent('Pay ' + (state.pn.trim() || 'me') + (a.value ? ' ' + U.formatINR(a.value) : '') + ' via UPI 👉 ' + link) : '#';
    $('wa').setAttribute('aria-disabled', String(!ready));
    $('open-pay').href = ready ? link.slice(link.indexOf('#')) : '#';
    save();
  }

  function fileName(ext) { var n = (state.pn || 'upi').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'upi'; return 'payposter-' + n + '-' + state.size + '.' + ext; }
  function canvasBlob(c) { return new Promise(function (res) { c.toBlob(res, 'image/png'); }); }

  function setFields() {
    ['pa', 'pn', 'am', 'tn', 'head'].forEach(function (k) { $(k).value = state[k] || ''; });
    $('hindi').checked = !!state.hindi;
    chips('styles', PP.STYLES, 'style', function (s) { return s.name; }, true);
    chips('sizes', PP.SIZES, 'size', function (s) { return s.label; }, false);
  }
  function bind() {
    ['pa', 'pn', 'am', 'tn', 'head'].forEach(function (k) { var el = $(k); el.addEventListener('input', function () { state[k] = el.value; update(); }); });
    $('hindi').addEventListener('change', function () { state.hindi = $('hindi').checked; update(); });
    setFields();

    $('dl').addEventListener('click', function () {
      var a = document.createElement('a'); a.download = fileName('png'); a.href = $('poster').toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove(); toast('Poster downloaded ✓');
    });
    $('share').addEventListener('click', function () {
      canvasBlob($('poster')).then(function (blob) {
        var f = new File([blob], fileName('png'), { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f], title: 'Pay via UPI', text: $('paylink').value }).catch(function () {}); }
        else { $('dl').click(); toast('Sharing not supported here — downloaded instead'); }
      });
    });
    $('print').addEventListener('click', function () {
      var c = document.createElement('canvas');
      var v = U.validateVpa(state.pa), a = U.normalizeAmount(state.am);
      PP.render(c, { pa: v.value, pn: state.pn.trim(), am: a.value, tn: state.tn.trim(), head: state.head.trim(), style: state.style, size: 'a4', hindi: state.hindi }, lastUri);
      $('printimg').src = c.toDataURL('image/png');
      setTimeout(function () { window.print(); }, 150);
    });
    function copy(text, ok) {
      (navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { toast(ok); }, function () {
        var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); toast(ok); } catch (e) { toast('Copy failed — long-press to copy'); } t.remove();
      });
    }
    $('copy').addEventListener('click', function () { copy($('paylink').value, 'Pay link copied ✓'); });
    $('copy-upi').addEventListener('click', function () { copy(lastUri, 'upi:// link copied ✓'); });
    $('wa').addEventListener('click', function (e) { if ($('wa').getAttribute('aria-disabled') === 'true') e.preventDefault(); });
    $('clear').addEventListener('click', function () { try { localStorage.removeItem(KEY); } catch (e) {} state = { pa: '', pn: '', am: '', tn: '', head: '', style: 'noir', size: 'story', hindi: false }; setFields(); update(); toast('Cleared'); });

    // split bill
    var splitRes = null;
    function doSplit() {
      splitRes = U.splitBill($('st').value, $('sp').value);
      $('split-out').innerHTML = splitRes ? 'Each person pays <b>' + U.formatINR(splitRes.each) + '</b>' + (splitRes.collected !== U.normalizeAmount($('st').value).value ? ' <small>(rounded up — total collected ' + U.formatINR(splitRes.collected) + ')</small>' : '') : 'Total aur log daalo — per head amount yahin dikhega.';
      $('split-use').disabled = !splitRes;
    }
    $('st').oninput = doSplit; $('sp').oninput = doSplit;
    $('split-use').onclick = function () { if (!splitRes) return; state.am = splitRes.each; $('am').value = splitRes.each; if (!state.tn) { state.tn = 'Split bill (' + Math.floor($('sp').value) + ' people)'; $('tn').value = state.tn; } update(); toast('Amount set to ' + U.formatINR(splitRes.each)); };
    bind.copy = copy;
  }

  // ---- pay page ----
  function showPay(p) {
    $('maker').hidden = true; $('how').hidden = true; $('payview').hidden = false;
    var v = U.validateVpa(p.pa || ''), a = U.normalizeAmount(p.am || '');
    if (!v.ok || !a.ok) { $('pv-bad').hidden = false; $('pv-pay').hidden = true; $('pv-name').textContent = 'Invalid link'; document.title = 'Invalid pay link — PayPoster'; return; }
    var uri = U.buildUpiUri({ pa: v.value, pn: p.pn, am: a.value, tn: p.tn });
    $('pv-name').textContent = p.pn ? 'Pay ' + p.pn : 'Pay via UPI';
    $('pv-amt').textContent = a.value ? U.formatINR(a.value) : 'Enter any amount in your app';
    if (!a.value) $('pv-amt').style.fontSize = '18px';
    $('pv-note').textContent = p.tn ? '“' + p.tn + '”' : '';
    $('pv-id').textContent = v.value;
    $('pv-pay').href = uri;
    var c = $('pv-qr'), ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    PP.drawQR(ctx, uri, 0, 0, c.width, '#000');
    document.title = (p.pn ? 'Pay ' + p.pn : 'UPI payment') + ' — PayPoster';
    $('pv-copy').onclick = function () { bind.copy(v.value, 'UPI ID copied ✓'); };
  }
  function showMaker() { $('maker').hidden = false; $('how').hidden = false; $('payview').hidden = true; document.title = 'PayPoster — Free UPI QR Poster & Pay Link Maker'; update(); }
  function route() { var p = U.parsePayHash(location.hash); if (p) showPay(p); else if (!$('maker').hidden) update(); else showMaker(); }
  $('pv-make').addEventListener('click', function (e) { e.preventDefault(); history.pushState('', '', pageBase()); showMaker(); window.scrollTo(0, 0); });

  load(); bind();
  window.addEventListener('hashchange', route);
  route();
  if (!U.parsePayHash(location.hash)) update();
})();
