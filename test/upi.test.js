const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const SITE = fs.existsSync(path.join(__dirname, '..', 'site')) ? path.join(__dirname, '..', 'site') : path.join(__dirname, '..');
const U = require(path.join(SITE, 'js', 'upi.js'));

test('VPA validation', () => {
  assert.ok(U.validateVpa('anish@okaxis').ok);
  assert.ok(U.validateVpa(' 98xxxx.12@ybl ').ok);
  assert.ok(!U.validateVpa('anish').ok);
  assert.ok(!U.validateVpa('@okaxis').ok);
  assert.ok(U.validateVpa('a b@okaxis').ok); // spaces are stripped
  assert.ok(!U.validateVpa('').ok);
});
test('amount normalisation', () => {
  assert.deepStrictEqual(U.normalizeAmount(''), { ok: true, value: '' });
  assert.strictEqual(U.normalizeAmount('199').value, '199.00');
  assert.strictEqual(U.normalizeAmount('₹1,250.5').value, '1250.50');
  assert.ok(!U.normalizeAmount('0').ok);
  assert.ok(!U.normalizeAmount('12.345').ok);
  assert.ok(!U.normalizeAmount('abc').ok);
});
test('UPI URI is standard and encoded', () => {
  const u = U.buildUpiUri({ pa: 'anish@okaxis', pn: 'Anish Store', am: '49', tn: 'Chai & samosa' });
  assert.strictEqual(u, 'upi://pay?pa=anish%40okaxis&pn=Anish%20Store&am=49.00&cu=INR&tn=Chai%20%26%20samosa');
  assert.strictEqual(U.buildUpiUri({ pa: 'x1@ybl' }), 'upi://pay?pa=x1%40ybl&cu=INR');
  assert.throws(() => U.buildUpiUri({ pa: 'nope' }));
});
test('pay page link round-trips', () => {
  const link = U.buildPayPageUrl('https://heyyanixx-payposter.sites.tab.bot/#old', { pa: 'anish@okaxis', pn: 'Anish & Co', am: '10', tn: 'Fest #2' });
  assert.ok(link.startsWith('https://heyyanixx-payposter.sites.tab.bot/#/pay?'));
  const p = U.parsePayHash(link.slice(link.indexOf('#')));
  assert.deepStrictEqual(p, { pa: 'anish@okaxis', pn: 'Anish & Co', am: '10.00', tn: 'Fest #2' });
  assert.strictEqual(U.parsePayHash('#how'), null);
});
test('split bill rounds up so total is covered', () => {
  assert.deepStrictEqual(U.splitBill('1000', 3), { each: '333.34', collected: '1000.02' });
  assert.deepStrictEqual(U.splitBill('1260', 4), { each: '315.00', collected: '1260.00' });
  assert.strictEqual(U.splitBill('0', 3), null);
});
test('site files: title, viewport, local assets exist, no placeholders, no phone number', () => {
  const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  assert.match(html, /<title>PayPoster/);
  assert.match(html, /name="viewport" content="width=device-width/);
  for (const m of html.matchAll(/(?:src|href)="([^"#:]+?)(?:\?[^"]*)?"/g)) {
    assert.ok(fs.existsSync(path.join(SITE, m[1])), 'missing ' + m[1]);
  }
  const all = ['index.html', 'styles.css', 'js/app.js', 'js/poster.js', 'js/upi.js'].map(f => fs.readFileSync(path.join(SITE, f), 'utf8')).join('\n');
  assert.ok(!/lorem ipsum|TODO|FIXME/i.test(all));
  assert.ok(!/8709714586/.test(all));
});
