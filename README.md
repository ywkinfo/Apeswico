# Apeswico

Static GitHub Pages scaffold for a Korean-speaking Spanish learning app.

## Current state

This repository currently contains the autonomous harness skeleton:

- task manifest
- runner
- verification script
- recovery hints
- project guardrails

The learning app pages and data come next.

## Useful commands

```bash
node scripts/harness/run.mjs auto
node scripts/harness/run.mjs next
node scripts/harness/run.mjs list
node scripts/harness/verify.mjs
node scripts/validate-data.mjs
```

## Notes

- Keep asset paths relative.
- Keep runtime state in `.omx/state/`.
- Use GitHub Pages root deployment with `.nojekyll`.
- Prefer `node scripts/harness/run.mjs auto` to advance the harness without manual bookkeeping.
