# Apeswico Spanish Learning App

## Goal
Build a static GitHub Pages app for Korean-speaking B1-B2 Spanish learners.

## Constraints
- Use Vanilla HTML, CSS, and JavaScript only.
- Do not add frameworks or runtime API calls.
- Use relative paths only so GitHub Pages project sites keep working.
- Prefer ES modules and browser-native APIs.
- Do not add npm dependencies unless explicitly requested.

## Content Rules
- Every learner-facing Spanish sentence needs a natural Korean translation.
- Every grammar item needs a Korean explanation.
- Label all content with `level` and `sublevel`.
- Keep each lesson focused on one grammar point or one reading target.

## Verification
- Run `node scripts/harness/verify.mjs` for scaffold and harness checks.
- Run `node scripts/validate-data.mjs` after changing data files.
- Use a local HTTP server for browser checks; do not rely on `file://`.
- Prefer `node scripts/harness/run.mjs auto` to advance completed work and keep the harness moving.

## Runtime State
- Harness state lives under `.omx/state/`.
- Keep runtime state out of commits.

## Safety
- Never use absolute asset paths like `/css/style.css`.
- Never commit secrets, keys, or personal data.
