/* PayPoster — UPI helpers (pure functions, no DOM).
   MIT License (c) 2026 Anish (HEYYANIXX). */
(function (root) {
  'use strict';
  // A UPI ID (VPA) looks like  name@bank  — letters, digits, dot, dash, underscore before the @,
  // a handle of letters/digits after it.
  var VPA_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,255}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;

  function cleanVpa(v) { return String(v || '').trim().replace(/\s+/g, ''); }

  function validateVpa(v) {
    v = cleanVpa(v);
    if (!v) return { ok: false, msg: 'UPI ID daalo (jaise name@okaxis)' };
    if (v.indexOf('@') === -1) return { ok: false, msg: 'UPI ID me @ hona chahiye (jaise name@ybl)' };
    if (!VPA_RE.test(v)) return { ok: false, msg: 'Ye UPI ID sahi format me nahi lag raha' };
    return { ok: true, value: v };
  }

  // Amount is optional. Returns {ok, value:'199.00'|'' }.
  function normalizeAmount(a) {
    var s = String(a == null ? '' : a).trim().replace(/[,\s₹]/g, '');
    if (s === '') return { ok: true, value: '' };
    if (!/^\d{1,8}(\.\d{1,2})?$/.test(s)) return { ok: false, msg: 'Amount sirf number me (max 2 decimal)' };
    var n = Number(s);
    if (!(n > 0)) return { ok: false, msg: 'Amount 0 se zyada hona chahiye' };
    return { ok: true, value: n.toFixed(2) };
  }

  function clip(s, n) { s = String(s || '').replace(/[\r\n\t]+/g, ' ').trim(); return s.length > n ? s.slice(0, n) : s; }

  // Builds the standard UPI deep link:  upi://pay?pa=..&pn=..&am=..&cu=INR&tn=..
  function buildUpiUri(o) {
    var v = validateVpa(o.pa);
    if (!v.ok) throw new Error(v.msg);
    var parts = ['pa=' + encodeURIComponent(v.value)];
    var pn = clip(o.pn, 50); if (pn) parts.push('pn=' + encodeURIComponent(pn));
    var am = normalizeAmount(o.am); if (!am.ok) throw new Error(am.msg);
    if (am.value) parts.push('am=' + am.value);
    parts.push('cu=INR');
    var tn = clip(o.tn, 60); if (tn) parts.push('tn=' + encodeURIComponent(tn));
    return 'upi://pay?' + parts.join('&');
  }

  // Shareable pay-page link for this site: <base>#/pay?pa=..&pn=..&am=..&tn=..
  function buildPayPageUrl(base, o) {
    var q = [];
    ['pa', 'pn', 'am', 'tn'].forEach(function (k) {
      var val = k === 'am' ? normalizeAmount(o.am).value : (k === 'pa' ? cleanVpa(o.pa) : clip(o[k], k === 'pn' ? 50 : 60));
      if (val) q.push(k + '=' + encodeURIComponent(val));
    });
    return String(base).split('#')[0] + '#/pay?' + q.join('&');
  }

  function parsePayHash(hash) {
    var m = String(hash || '').match(/^#\/pay\?(.*)$/);
    if (!m) return null;
    var out = {};
    m[1].split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('=');
      var k = i < 0 ? kv : kv.slice(0, i);
      var val = i < 0 ? '' : kv.slice(i + 1);
      try { val = decodeURIComponent(val.replace(/\+/g, ' ')); } catch (e) { val = ''; }
      if (/^(pa|pn|am|tn)$/.test(k)) out[k] = val;
    });
    return out;
  }

  // Split a bill: returns per-person amount rounded UP to the paisa, so the total is always covered.
  function splitBill(total, people) {
    var t = Number(String(total).replace(/[,\s₹]/g, '')), p = Math.floor(Number(people));
    if (!(t > 0) || !(p >= 1)) return null;
    var paise = Math.ceil(Math.round(t * 100) / p);
    return { each: (paise / 100).toFixed(2), collected: ((paise * p) / 100).toFixed(2) };
  }

  function formatINR(v) {
    if (v === '' || v == null) return '';
    var n = Number(v);
    var s = n.toLocaleString('en-IN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
    return '\u20B9' + s;
  }

  var api = { validateVpa: validateVpa, normalizeAmount: normalizeAmount, buildUpiUri: buildUpiUri,
    buildPayPageUrl: buildPayPageUrl, parsePayHash: parsePayHash, splitBill: splitBill, formatINR: formatINR, cleanVpa: cleanVpa };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PPUpi = api;
})(typeof window !== 'undefined' ? window : globalThis);
