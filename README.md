# Cell Atlas

An interactive, mobile-first Three.js atlas of a **generalized mammalian interphase cell**. Plain ES modules and Vite. Copyright © TR Ingram.

## Run

```sh
cd /Users/tr/Projects/cell-atlas
export PATH=/Users/tr/.hermes/node/bin:$PATH
npm install
npm run dev
# http://127.0.0.1:4175
```

```sh
npm test                    # metadata + generated-geometry invariants
npm run build               # deployable static files in dist/
npm run test:e2e             # desktop/mobile Chromium + WebGL fallback
node tests/responsive.js     # 320×568, 390×844, 844×390, 1024×768
node tests/gestures.js       # real CDP touch orbit, pinch, pan, tap selection
node tests/production.js     # built assets under /cell-atlas/ subpath
```

The browser tests require the dev server at port 4175, except production.js, which starts and closes its own loopback server. Install Chromium with `npx playwright install chromium` if absent. Test launch uses full Chromium and `--use-angle=metal` on macOS to verify real GPU WebGL, not fabricated canvas screenshots. Adjust ANGLE arguments for other operating systems.

`vite.config.js` uses `base: './'`. Serve `dist/` at a root or subpath. No external deployment or Git remote operations are part of this project.

## Explore

- One finger / left drag: orbit. Pinch / wheel: zoom. Two fingers / right drag: pan.
- Tap a large rendered structure, or use the color-keyed structure index, to select it. The index also covers tiny particles and the membrane.
- Focus centers a representative structure. Isolate shows the selected class; nucleus isolation retains its nucleolus. Reset restores framing, visibility, and section depth.
- View settings: section slider, membrane visibility, labels, and efficient/balanced/detailed rendering.
- Rotation starts slowly unless reduced motion is requested; direct manipulation pauses it. The rotation button resumes or pauses.
- Canvas keyboard: arrow keys orbit, +/− zoom, Home resets. All organelles are available from keyboard-accessible index buttons.
- Field notes and Sources & accuracy include direct NCBI references. Native dialogs support Escape and focus management.
- `?webgl=off` exercises the accessible reading-mode fallback. Initialization failure and context loss also fall back to the structure guide.

## Geometry

Seeded procedural geometry includes two perforated nuclear envelopes with stylized eightfold pore rings; interphase chromatin fibers and a lobed, non-membranous nucleolus; paired rough-ER sheets connected by membrane bridges to each other and the nuclear envelope, with attached ribosomes; a branching smooth-ER network; six curved Golgi cisternae with membrane buds and vesicles; fourteen two-membrane mitochondrial cutaways with cristae; lysosomes, peroxisomes, multivesicular-endosome-like compartments; free paired ribosomal particles; an irregular cortical mesh and longer cytoskeletal tracks; and a translucent open plasma membrane.

Repeated small structures are instanced. Static geometry is merged by material/selection group. Balanced mode uses approximately 659k triangles and 42 draw calls in the tested overview. DPR caps are 1.0 / 1.5 / 1.75 for efficient / balanced / detailed. Curve tessellation changes with quality. Scene rendering is skipped in hidden tabs.

## Scientific and technical limits

This is an educational illustration, **not a measured reconstruction, molecular simulation, or independently validated scientific model**. False colors, illustrative counts/placement, simplified membrane topology, enlarged molecular features, and exaggerated membrane spacing are declared in the UI. No exact scale bar is provided. Chromatin is interphase fiber-like material, not mitotic X-shaped chromosomes. No plant organelles or Golgi-lumen ribosomes are modeled.

The cell and nucleus have permanent display windows. The section slider clips surfaces without filling/capping exposed volumes. Cristae and ER topology are visual approximations, not watertight segmented biological meshes. Cytoskeletal paths do not represent a reconstructed molecular network. Endosomal intraluminal vesicles illustrate one morphology. Detailed photorealistic molecular packing, diffusion, and live cell dynamics are outside scope.

Automated science checks verify **metadata and generated-geometry invariants**, not biological accuracy. Independent biological review remains valuable. Mobile viewport and touch emulation ran on an Apple M4 GPU; performance on physical iPhones/Android devices and Safari was not measured. Decorative Google Fonts require network access; Georgia/Arial fallbacks preserve usability offline. No analytics or application backend.

## Files

- `src/data.js` — descriptions, disclaimers, reference mapping, seed.
- `src/cell.js` — deterministic procedural meshes, instancing, geometry/material grouping.
- `src/main.js` — renderer, selection, controls, dialogs, fallback, diagnostics.
- `src/style.css`, `index.html` — responsive Explore surface and inspector.
- `tests/` — unit, browser, responsive, touch, and production-subpath tests.
- `evidence/` — actual browser screenshots and JSON receipts, not mockups.
- `dist/` — production artifact.

## References

- https://www.ncbi.nlm.nih.gov/books/NBK26907/ — compartments
- https://www.ncbi.nlm.nih.gov/books/NBK26841/ — endoplasmic reticulum
- https://www.ncbi.nlm.nih.gov/books/NBK554382/ — cell histology
- https://www.ncbi.nlm.nih.gov/books/NBK9953/ — lysosomes and endosomal trafficking
- https://www.ncbi.nlm.nih.gov/books/NBK9896/ — mitochondria
- https://www.ncbi.nlm.nih.gov/books/NBK9927/ — nuclear envelope and pores

The design is an original Explore / Inspect composition: restrained evergreen-black surfaces, serif specimen headings, a compact sans-serif index, false-color structures, and minimal interface chrome. The final visual self-audit found none of the compositional template tells (centered hero, feature tiles, decorative cards). Rendering detail, not dashboard ornament, carries the experience.
