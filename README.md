# Cell Atlas

An interactive, mobile-first Three.js atlas with three selectable, scientifically scoped specimens: a **generalized mammalian interphase cell**, a **generalized photosynthetic plant cell**, and an **early-budded Saccharomyces cerevisiae cell**. Plain ES modules and Vite. Copyright © TR Ingram.

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
npm run test:e2e             # original mammalian desktop/mobile + WebGL fallback
npm run test:models          # switching, all models/structures, five viewports, fallback/lifecycle
node tests/responsive.js     # 320×568, 390×844, 844×390, 1024×768
node tests/gestures.js       # real CDP touch orbit, pinch, pan, tap selection
node tests/usability.js      # inline touch slider, structure navigation, short landscape
node tests/production.js     # built assets under /cell-atlas/ subpath
```

The browser tests use `BASE_URL` (default `http://127.0.0.1:4175`), except production.js, which starts and closes its own loopback server. Avoid silently testing another server: start Vite with `npm run dev -- --strictPort`, or choose a free port with `npm run dev -- --port 4176 --strictPort` and run tests with `BASE_URL=http://127.0.0.1:4176`. Verify the server root before collecting evidence. Install Chromium with `npx playwright install chromium` if absent. Test launch uses full Chromium and `--use-angle=metal` on macOS to verify real GPU WebGL, not fabricated canvas screenshots. Adjust ANGLE arguments for other operating systems.

`vite.config.js` uses `base: './'`. Serve `dist/` at a root or subpath. GitHub Actions runs unit tests and a production build for pull requests; deployment to GitHub Pages runs only from `main`, not from PRs.

## Explore

- The always-available **Cell model** selector switches between mammalian, plant and budding yeast specimens. Switching loads that specimen’s structure index, labels, field notes and reference library, selects its default structure, resets sectioning/isolation/boundary visibility and camera framing, and pauses rotation. Rendering quality and label preferences are retained. The selector also works in reading mode.

- One finger / left drag: orbit. Pinch / wheel: zoom. Two fingers / right drag: pan.
- Tap a large rendered structure, or use the color-keyed structure index, to select it. The index also covers tiny particles and the membrane.
- Index selection and previous/next center a representative structure; navigation wraps. They clear section depth and reveal a hidden membrane when selected. Canvas taps select without unexpectedly zooming.
- Focus reveals and centers the selection. Isolate follows navigation and retains the nucleolus with the nucleus. Whole cell restores framing, visibility, and section depth without discarding the selected field notes.
- Section depth stays beside the model, with a live percentage, a large native slider, keyboard arrows/Home/End, and an Off reset. Deliberate sectioning can hide parts; Focus reveals the selection again. Cut faces remain open, not volume-filled.
- View settings: membrane visibility, an independent cell-wall toggle for plant/yeast, labels, and efficient/balanced/detailed rendering. Focus reveals a hidden selected boundary. Whole cell restores both boundaries.
- Rotation starts slowly unless reduced motion is requested; direct manipulation pauses it. The rotation button resumes or pauses.
- Canvas keyboard: arrow keys orbit, +/− zoom, Home resets. All organelles are available from keyboard-accessible index buttons.
- Field notes and Sources & accuracy include direct NCBI Bookshelf and peer-reviewed PMC references scoped to the current model. Native dialogs support Escape and focus management.
- `?webgl=off` exercises the accessible reading-mode fallback. Initialization failure and context loss also fall back to the structure guide.

## Geometry

The original mammalian specimen retains its geometry, colors and twelve structures; a SHA-256 regression checks the actual low-quality vertex/index/instance buffers against the pre-change model.

Seeded procedural geometry includes two perforated nuclear envelopes with stylized eightfold pore rings; interphase chromatin fibers and a lobed, non-membranous nucleolus; paired rough-ER sheets connected by membrane bridges to each other and the nuclear envelope, with attached ribosomes; a branching smooth-ER network; six curved Golgi cisternae with membrane buds and vesicles; fourteen two-membrane mitochondrial cutaways with cristae; lysosomes, peroxisomes, multivesicular-endosome-like compartments; free paired ribosomal particles; an irregular cortical mesh and longer cytoskeletal tracks; and a translucent open plasma membrane.

The **plant** specimen has fourteen selectable structures: its own rounded box-like primary wall with crossed fiber texture, a separate inner plasma membrane, a large tonoplast-bounded vacuole, six chloroplast cutaways with two envelope membranes and stacked thylakoids joined by lamellae, two discrete Golgi stacks, and peripheral shared organelles. Animal-style lysosomes are replaced by the lytic vacuole. No adjacent cells, plasmodesmata or woody secondary wall are modeled.

The **fungal** specimen also has fourteen structures. A continuous mother–neck–bud surface defines the wall and inner membrane (not two overlapping spheres). A neck ring and older scars suggest chitin-rich regions; the cytoplasmic connection remains open. It has a lytic vacuole, dispersed individual Golgi cisternae including one in the bud, and an ER extension into the bud. It has no chloroplasts or cellulose plant wall; it is not a hyphal mold or a universal fungal cell.

Repeated small structures are instanced. Static geometry is merged by material/selection group. Model/quality replacement disposes geometry, materials and instance buffers; repeated switching is tested for stable geometry counts. Balanced mammalian rendering uses approximately 659k triangles and 42 draw calls in the tested overview; plant and yeast are denser and performance is device-dependent. DPR caps are 1.0 / 1.5 / 1.75 for efficient / balanced / detailed. Curve tessellation changes with quality. Scene rendering is skipped in hidden tabs.

## Scientific and technical limits

This is an educational illustration, **not a measured reconstruction, molecular simulation, or independently validated scientific model**. False colors, illustrative counts/placement, simplified membrane topology, enlarged molecular features, and exaggerated membrane spacing are declared in the UI. No exact scale bar is provided. Chromatin is interphase fiber-like material, not mitotic X-shaped chromosomes. There are no Golgi-lumen ribosomes. Photosynthetic plant features are confined to the plant model; fungal features specifically describe budding yeast. Counts and proportions are not comparisons of real cell sizes across taxa.

The cell boundaries, nuclei and selected organelles have permanent display windows. Shared organelle morphology is reused where appropriate with taxon-specific layout and field notes. Plant and yeast organelles and free-ribosome centers are checked against the vacuole lumen; this is an illustration invariant, not a full collision-free molecular packing simulation. The section slider clips surfaces without filling/capping exposed volumes. Cristae and ER topology are visual approximations, not watertight segmented biological meshes. Cytoskeletal paths do not represent a reconstructed molecular network. Endosomal intraluminal vesicles illustrate one morphology. Detailed photorealistic molecular packing, diffusion, and live cell dynamics are outside scope.

Automated science checks verify **metadata and generated-geometry invariants**, not biological accuracy. Independent biological review remains valuable. Mobile viewport and touch emulation ran on an Apple M4 GPU; performance on physical iPhones/Android devices and Safari was not measured. Decorative Google Fonts require network access; Georgia/Arial fallbacks preserve usability offline. No analytics or application backend.

## Files

- `src/data.js` — preserved mammalian descriptions, disclaimers, reference mapping and seed.
- `src/models.js` — three-model registry, scoped biology, reference library, captions and labels.
- `src/walled-cell.js` — plant/yeast outlines, layouts, vacuoles, chloroplasts and bud structures.
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
- https://pmc.ncbi.nlm.nih.gov/articles/PMC11062476/ — plant wall composition and function
- https://pmc.ncbi.nlm.nih.gov/articles/PMC4075315/ — chloroplast envelope, grana and stroma lamellae
- https://pmc.ncbi.nlm.nih.gov/articles/PMC6783984/ — plant vacuoles, tonoplast and lytic functions
- https://www.ncbi.nlm.nih.gov/books/NBK26844/ — plant and fungal vacuoles
- https://www.ncbi.nlm.nih.gov/books/NBK26858/ — plant/yeast peroxisomes
- https://pmc.ncbi.nlm.nih.gov/articles/PMC3522159/ — S. cerevisiae wall, chitin-rich neck and scars
- https://pmc.ncbi.nlm.nih.gov/articles/PMC2788027/ — dispersed yeast Golgi cisternae versus stacks

The design is an original Explore / Inspect composition: restrained evergreen-black surfaces, serif specimen headings, a compact sans-serif index, false-color structures, and minimal interface chrome. The final visual self-audit found none of the compositional template tells (centered hero, feature tiles, decorative cards). Rendering detail, not dashboard ornament, carries the experience.
