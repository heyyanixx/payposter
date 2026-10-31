# Contributing to PayPoster

Thanks for wanting to help! 🙌 Hinglish or English — both are fine in issues and PRs.

## Easy first PRs
- **A new poster style** — add an entry to `STYLES` in `js/poster.js` (colours + headline). If it needs a special background, add a branch in `paintBg()`.
- **Translations** — footer lines in other Indian languages.
- **Bug reports** — tell us which UPI app and phone you tested with.

## Rules
1. Keep it static: no backend, no trackers, no API keys, no remote fonts.
2. Never change the UPI link format without a test in `test/upi.test.js`.
3. Run the tests before opening a PR:
   ```bash
   node --test test/
   python3 test/e2e.py http://localhost:8080/ ./qa   # optional, needs playwright + opencv
   ```
4. Every QR must still decode — the e2e test checks all styles × sizes with OpenCV.

## Code style
Plain ES5-compatible JavaScript, 2-space indent, small pure functions where possible.
