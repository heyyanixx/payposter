# AGENTS.md — PayPoster

Instructions for AI coding agents (Codex, OpenCode, Cursor, Claude Code, Copilot, etc.) working in this repo.
Owner: Anish (HEYYANIXX) · github.com/heyyanixx. Talk to him in simple English or Hinglish.

## What this repo is

PayPoster makes a **UPI QR poster + shareable pay link** fully in the browser. Static site: `index.html`, `styles.css`, `js/app.js` (UI), `js/poster.js` (canvas drawing + `STYLES`), `js/upi.js` (UPI link building), `vendor/qrcode.js` (qrcode-generator 1.4.4, MIT; don't edit vendor code).
- **No build step, no framework, no backend.** Plain ES5-compatible JavaScript, 2-space indent, small pure functions (see `CONTRIBUTING.md`).

## Build, test, deploy

- Run locally: `npm start` (= `python3 -m http.server 8080`) and open http://localhost:8080/.
- Unit tests: `npm test` (= `node --test test/`). **Must pass before every commit.**
- E2E (optional, needs Python Playwright + OpenCV): `python3 test/e2e.py http://localhost:8080/ ./qa`. It checks that every style × size QR still decodes.
- Hosted as a static site (`.nojekyll` at root). No CI workflow yet.

## Project rules (payments: be extra careful)

- **Never change the UPI link format** (`upi://pay?pa=…&pn=…&am=…&cu=INR&tn=…`, every value URL-encoded) without adding/updating a test in `test/upi.test.js`.
- Validate UPI IDs and amounts; money math rounds **up** to the paisa on split so nobody is short. Keep amounts as numbers, format only for display.
- Every QR must still decode after any poster/style change (run the e2e test or scan with a phone).
- Keep it static: no backend, no trackers, no API keys, no remote fonts, no network requests after load. User inputs stay in the URL hash / `localStorage` only.
- New poster style = new entry in `STYLES` in `js/poster.js` (+ a `paintBg()` branch if needed).
- Never put Anish's own UPI ID, phone number, or bank details in code, tests, or screenshots; use obvious fakes like `example@upi`.

## Security (always)

Adapted from ECC `rules/common/security.md` + `rules/web/security.md`.

Before every commit, check:
- No secrets in the repo: no API keys, passwords, tokens, keystores (`*.jks`, `*.keystore`), `.env` files, or private URLs with tokens in them. If one slipped in, stop, remove it, and tell the owner to **rotate** it (deleting the commit is not enough; Git history keeps it).
- Secrets live only in GitHub Actions secrets or a local `.env` that is git-ignored. Never print a secret in logs, code comments, README, or screenshots.
- This is a **static / client-side** project: everything shipped to the browser is public. Never put a real API key in client JS. Any paid API (AI, payments) must go through a server or proxy you control.
- Never add the owner's phone number, home address, or other private details anywhere in the repo.
- Escape user input before putting it in HTML. Avoid `innerHTML` / `dangerouslySetInnerHTML` with user data; prefer `textContent`.
- External links use `rel="noopener"`. Third-party scripts only when really needed; pin the version.
- Error messages shown to users must not leak internal details.
- Add a dependency only if it is needed, maintained, and MIT/Apache/BSD-style licensed; note it in the README or notices.

## How to work (ECC workflow, short version)

Adapted from ECC `rules/common/development-workflow.md`, `coding-style.md`, `git-workflow.md`.

1. **Read first.** Read the files you will touch and the README before changing anything. Reuse what exists before writing new code.
2. **Plan small.** For anything bigger than a one-line fix, write a short plan (files to change, risks) and wait for the owner's OK.
3. **Keep it simple** (KISS, DRY, YAGNI). Small functions (< ~50 lines), small focused files, early returns instead of deep nesting, named constants instead of magic numbers, handle errors explicitly (never swallow them silently).
4. **Validate input** at the edges (forms, URL params, files the user drops in).
5. **Test before you say "done"** (commands below). If you could not test something, say so plainly.
6. **Review your own diff** before committing: only the files the task needs, nothing generated, no secrets, no debug logs.
7. **Commit message** in conventional format: `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`, `refactor: ...`, `test: ...`, `ci: ...`.
8. Don't rewrite or reformat code that the task doesn't need. Don't add features that weren't asked for.
---

Rules adapted from [ECC (Everything Claude Code)](https://github.com/affaan-m/ECC) by Affaan Mustafa, MIT License (commit `b38be6a`). Only a small subset is used here; for the full skill/agent pack install ECC into your own coding tool (see ECC's README).
