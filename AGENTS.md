# Agent notes — ColoursFlux

## Git workflow (required)

- After **every** change, commit and push to GitHub (`origin main`) in the same turn.
- Do not leave the working tree dirty: `git status` must end with `## main...origin/main`.
- Group related edits into one commit with a short imperative subject, plus a body when the change is user-visible.
- Verify first, then commit: run the relevant checks (`node --check` for modules, the site/overflow probes, page render) before pushing.
- Never force-push `main` and never rewrite pushed history.
- Bump the `sw.js` `VERSION` whenever cached CSS/JS changes, and keep asset query strings in HTML in sync with the SW shell list.

## Project facts

- Static multi-page site + PWA; no build step. Preview with a static server on `http://127.0.0.1:4173/`.
- `assets/js/env.js` stays blank for demo mode (no Supabase).
- Palette: lilac/violet/magenta only — no amber on themed pages. Branding is logo-only (no text wordmark in header, footer, admin sidebar).
- Festival: Colours 2K27, 7–9 January 2027, Aditya University.
- Keep `?intro=0` working to skip the opening ident, and respect `prefers-reduced-motion`.
