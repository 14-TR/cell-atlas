# Plant and fungal model verification

Actual execution receipts and screenshots for the plant/fungal additions, collected on macOS using Chromium with the Apple M4 ANGLE Metal renderer. These are browser captures, not mockups. Node v26.8.1, npm 11.19.0. No physical-phone or Safari performance claim is made.

## Commands and results

All eight commands exited 0. Browser commands used `BASE_URL=http://127.0.0.1:4176`; `tests/production.js` starts its own server for the built `/cell-atlas/` subpath. The source hashes in [`commands/source-hashes.json`](commands/source-hashes.json) were checked before and after the complete run, with no drift. Original stdout is retained verbatim in `commands/01.log` through `commands/08.log`. The log paths recorded in `commands/commands.json` refer to their original local capture locations; this directory contains byte-identical delivery copies.

| Command | Result | Receipt |
|---|---|---|
| `npm test` | 19 passed, 0 failed, 0 skipped | [01.log](commands/01.log) |
| `npm run build` | Production build succeeded | [02.log](commands/02.log) |
| `npm run test:e2e` | Original desktop, mobile and reading-mode smoke cases passed | [03.log](commands/03.log), [JSON](smoke-results.json) |
| `npm run test:models` | 6 switching cases and 19 interaction scenarios passed; no captured page/console errors | [04.log](commands/04.log), [switching](model-results.json), [interactions](model-interaction-results.json) |
| `node tests/responsive.js` | 4 viewport cases passed | [05.log](commands/05.log), [JSON](responsive-results.json) |
| `node tests/gestures.js` | CDP touch orbit, pinch, pan and rendered-structure selection passed | [06.log](commands/06.log), [JSON](gesture-results.json) |
| `node tests/usability.js` | 8 existing mammalian usability scenarios passed | [07.log](commands/07.log), [JSON](usability-results.json) |
| `node tests/production.js` | All three built models switch/render; isolation, sourced notes and fungal fallback pass under `/cell-atlas/` | [08.log](commands/08.log), [JSON](production-results.json) |

The new interaction suite exercises all structures in all three models at 1440×1000, 390×844, 320×568, 568×320 and 844×390. It covers selection, focus, isolation, clipping reset, both boundary toggles, all three quality levels, labels, keyboard navigation, actual touch gestures at 390×844, context loss, renderer initialization failure, explicit reading mode, rapid animated switching, and repeated resource replacement. Stable renderer geometry counts are evidence of replacement cleanup, not a heap-wide proof of zero leaks.

Unit checks cover source-backed/scoped metadata, deterministic finite geometry at every quality level, required selectable groups, plant/yeast organelles outside vacuole lumens and inside cell envelopes, disposal events including instance buffers, and visible grana layering. In this historical macOS run, mammalian low-quality vertex/index/instance buffers matched the original platform-specific SHA-256 receipt. The preservation test now compares candidate and byte-preserved pre-change generators on the same runtime, after checking literal source-integrity hashes; it needs no Git history. See [CI portability follow-up](ci-followup/README.md) for the subsequent Ubuntu failure and bounded repair validation; the original green logs and GPU/browser receipts remain unchanged. Illustration constraints are not independent biological validation or a full collision-free packing simulation.

## Representative captures

- [Plant desktop](model-plant-1440x1000.png)
- [Budding yeast desktop](model-fungal-1440x1000.png)
- [Plant mobile](model-plant-390x844.png)
- [Budding yeast narrow mobile](model-fungal-320x568.png)

## Scope and limits

The plant model is photosynthetic, not a root cell or every plant tissue. The fungal model is early-budded *Saccharomyces cerevisiae*, not all fungi. Sources and scientific caveats are available per structure in the application and listed in the repository README. Counts, colors, positions, sizes, membrane spacing and windows are illustrative. Plant plasmodesmata/adjacent cells, full yeast organelle inheritance and a mitotic spindle are omitted deliberately. The permanent display windows and section plane are not natural holes or volume-capped sections.
