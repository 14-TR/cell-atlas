# CI portability follow-up

Failed run: https://github.com/14-TR/cell-atlas/actions/runs/36655715546

Candidate at failure: `c924bc37762dd19246415e25b3cf7bd3757b653f` (PR 14-TR/cell-atlas#1).

The archived Ubuntu x64 run used Node v22.23.2 and npm 10.9.8: 18 tests passed and the single fixed geometry SHA assertion failed. Observed low-quality fingerprint: `eb078c16cb8fbf031d588fc979aace792117c4bc62691f03fc99367ddf03f6fa`. The historical macOS Node v26.8.1 / npm 11.19.0 receipt was `1212927358e4c65fa8e8f182be428dfb31c1dae91226bb6a95232d9451da6d21`. These are platform/runtime-specific receipts, not interchangeable universal expectations. The logs do not isolate OS, architecture and Node-version effects individually; procedural trig byte portability is the defective test assumption, and no application defect is evidenced.

## Correction

The bounded test-only oracle is the exact `src/cell.js` and `src/data.js` from immutable commit `e7c9968c2c2b2ca465430c60eecc5070cd3472e8`, copied without byte/import normalization to `tests/fixtures/mammalian-baseline/`. Its provenance file records original paths, byte sizes, independently verified SHA-256 hashes, and the historical macOS fingerprint. Root LICENSE covers copied source.

Before importing the fixture, the preservation test checks both files against literal source hashes independently computed from Git blobs using Python SHA-256 and `shasum -a 256`. It compares low-quality material-name and position/index/instance-buffer fingerprints from baseline and candidate generators on the same runtime. It does not round coordinates, whitelist platform hashes, skip Linux, or use the candidate generator as its own oracle. Neither Git nor history is required at test time. This bounded repair does not add normal/material-property comparisons; the independent historical all-quality review remains separate evidence.

## Executed repair validation

Local platform: macOS arm64, Node v26.8.1, npm 11.19.0. Exact argv, cwd, exit codes and output hashes are in `validation.json`; verbatim outputs are alongside it.

- RED: `node --test --test-name-pattern='mammalian geometry remains byte-identical' tests/model-geometry.test.js` failed with the intended missing-fixture assertion before fixture extraction.
- GREEN: the same focused test passed after exact fixture extraction.
- `npm test` in the working tree: 19 passed, 0 failed, 0 skipped.
- `npm run build -- --outDir /Users/tr/Projects/cell-atlas/.git/reviews/plant-fungal-v1/fixer/root-build --emptyOutDir`: succeeded; output stayed in authorized scratch rather than modifying root dist.
- A fresh source copy at `.git/reviews/plant-fungal-v1/fixer/source-without-git` contains no `.git`, uses the existing root node_modules symlink, and runs with `GIT_CEILING_DIRECTORIES` set to its parent. Git discovery fails as expected. `npm test`: 19 passed, 0 failed, 0 skipped. Exact `npm run build`: succeeded.
- Scratch-only comment corruption of each fixture file independently caused the focused test to fail with `baseline fixture integrity: cell.js` / `data.js`; bytes were restored in finally blocks. The restored focused test passed.
- Private Vite build audit (`build.write=false`) enumerated generated chunk module IDs: candidate source present, no tests or fixture modules included.
- `git diff --check`: passed. All six entries in the historical source-hash ledger match; all src files and index.html additionally match the initial clean HEAD bytes. See `source-unchanged.json`.

Original green command logs and browser/GPU evidence were not rewritten. Failed CI logs here are byte-identical copies of the supplied archive, not a new remote run. No Linux rerun, new GPU/browser execution, package installation, commit, push, PR change or merge was performed. The portability blocker is repaired and locally validated; remote CI confirmation remains pending a separately authorized publication/rerun.
