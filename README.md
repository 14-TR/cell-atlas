# Cell Atlas

An interactive, mobile-first Three.js atlas with six selectable, scientifically scoped specimens: a **generalized mammalian interphase cell**, a **generalized photosynthetic plant cell**, an **early-budded Saccharomyces cerevisiae cell**, a **motile Escherichia coli bacterium**, a **generalized multipolar neuron**, and a **mature human red blood cell**. A separate **118-element periodic table** opens interactive 3D educational atom models. Plain ES modules and Vite. Copyright © TR Ingram.

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

- The always-available **Cell model** selector switches between mammalian, plant, budding yeast, E. coli, neuron and mature human red blood cell specimens. Switching loads that specimen’s structure index, labels, field notes and reference library, selects its default structure, resets sectioning/isolation/boundary visibility and camera framing, and pauses rotation. Rendering quality and label preferences are retained. The selector also works in reading mode.

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

## Elements

Choose **Periodic table** in the cell footer, or open `atoms.html`. All 118 buttons occupy the conventional 18-column table with detached lanthanide/actinide rows. The table scrolls horizontally on narrow phones without shrinking touch targets. Search by name, symbol or atomic number; Enter opens the first result. Table arrows navigate spatially; Home/End move within a row.

Each button opens a native dialog with a real Three.js atom, mouse/touch orbit, pinch/wheel zoom, keyboard arrows/+/-/Home, explicit zoom/reset controls, element details and neutral electron shell counts. Escape/Close restores focus. The close control stays visible while scrolling notes. One renderer is reused; each atom's geometry/material/instance buffers are released on close or replacement. Context loss and `atoms.html?webgl=off` retain all text and selection in reading mode.

The default is an **animated teaching model**: mint electron markers move along illustrative shell guides; orange protons and blue neutrons gently move inside the clustered nucleus. The particle legend is directly below the canvas, including on phones. **Pause animation** freezes particles and cloud glow without freezing camera interaction; **Rotate view** separately controls camera rotation (off initially). **Particles** and **Cloud** toggle independent layers. The optional glowing cloud is off by default. **Enlarge nucleus** emphasizes the nuclear cluster in place without reframing the camera or moving electron shells. Display choices and deliberate animation pause persist across selections in the page session.

Reduced-motion users start with both animation and camera rotation stopped, with explicit opt-in available. A live change to reduced motion stops both; removing that preference does not restart them automatically. The animation clock and render loop stop when the canvas scrolls out of view, the page is hidden, the dialog is closed, or the context is lost. Returning onscreen resumes from the held illustration time without a catch-up jump.

**Educational shell model, not to scale. Moving markers and shell paths are not literal electron trajectories or observations.** Speeds, nucleus packing, particle sizes and distances are illustrative; the gentle nucleon motion is not nuclear dynamics. The optional cloud is a **qualitative orbital-inspired illustration**, not a solved multielectron wavefunction or quantitative probability map. Neutrons belong to the named representative isotope, not a rounded average atomic weight. Configurations come from PubChem, with NIST's 7p Lawrencium correction; superheavy predictions are flagged. See [source, isotope and licensing details](DATA-SOURCES.md).

### Animation verification

```sh
npm test
npm run build
npm run test:animation
npm run test:animation-regressions
python3 scripts/freeze-animation.py
```

Both new browser commands own ephemeral **127.0.0.1** servers and compare served HTML with the exact built entries. The temporal suite runs under `/cell-atlas/`, proves actual marker-buffer and rendered-pixel changes at a stationary camera, exact paused positions/time and stable pixels (at most eight single-channel-step raster differences), independent camera rotation, optional cloud glow, reduced-motion handling, real scroll-offscreen suspension, synthetic document-visibility handling, context loss and disposal. Every element animates in a mobile-emulated GPU browser. The regression wrapper runs all existing expansion and original browser scripts **unchanged**, writing into a fresh `evidence/animation/regressions-*` directory instead of replacing historical evidence. `ANIMATION_EVIDENCE` can select an alternate temporal-suite receipt directory. All new receipts belong under `evidence/animation/`; the freeze script saves source/build/evidence copies and SHA-256 manifests outside the worktree without staging, committing or modifying expansion receipts. Chromium/Metal mobile emulation is not physical-phone or Safari validation.

## Expansion verification

With the app running on an explicitly chosen port and `dist/` freshly built:

```sh
npm test
npm run build
BASE_URL=http://127.0.0.1:4175 npm run test:expansion
BASE_URL=http://127.0.0.1:4175 npm run test:baseline-browser
```

The expansion suite covers six cells at five viewport sizes, all 118 element buttons and geometry/particle totals, H/C/Fe/Au/U/Og renders, keyboard/scrolling, real CDP touch orbit/pinch, 48 atom disposal cycles, 24 cell switches, context loss, forced fallback and production `/cell-atlas/` navigation. Baseline browser scripts execute unchanged in an isolated output directory, preserving historical evidence. GPU screenshots remain in `evidence/expansion/` but are ignored by Git; small JSON/text receipts and the review report can be staged separately. No physical-device/Safari performance claim is made.

## Geometry

The original mammalian specimen retains its geometry, colors and twelve structures. The preservation test compares SHA-256 fingerprints of low-quality material names and vertex/index/instance buffers from the candidate and an independent, byte-preserved pre-change generator on the same runtime. The test-only fixture comes from commit `e7c9968c2c2b2ca465430c60eecc5070cd3472e8`; literal source-integrity hashes protect both fixture files, and tests require no Git history. Historical platform-specific geometry hashes are receipts, not cross-runtime oracles; see [CI follow-up](evidence/plant-fungal/ci-followup/README.md).

Seeded procedural geometry includes two perforated nuclear envelopes with stylized eightfold pore rings; interphase chromatin fibers and a lobed, non-membranous nucleolus; paired rough-ER sheets connected by membrane bridges to each other and the nuclear envelope, with attached ribosomes; a branching smooth-ER network; six curved Golgi cisternae with membrane buds and vesicles; fourteen two-membrane mitochondrial cutaways with cristae; lysosomes, peroxisomes, multivesicular-endosome-like compartments; free paired ribosomal particles; an irregular cortical mesh and longer cytoskeletal tracks; and a translucent open plasma membrane.

The **plant** specimen has fourteen selectable structures: its own rounded box-like primary wall with crossed fiber texture, a separate inner plasma membrane, a large tonoplast-bounded vacuole, six chloroplast cutaways with two envelope membranes and stacked thylakoids joined by lamellae, two discrete Golgi stacks, and peripheral shared organelles. Animal-style lysosomes are replaced by the lytic vacuole. No adjacent cells, plasmodesmata or woody secondary wall are modeled.

The **fungal** specimen also has fourteen structures. A continuous mother–neck–bud surface defines the wall and inner membrane (not two overlapping spheres). A neck ring and older scars suggest chitin-rich regions; the cytoplasmic connection remains open. It has a lytic vacuole, dispersed individual Golgi cisternae including one in the bud, and an ER extension into the bud. It has no chloroplasts or cellulose plant wall; it is not a hyphal mold or a universal fungal cell.

The **bacterium** is a motile vegetative E. coli: a rod-shaped cutaway with separate inner membrane, peptidoglycan wall and outer membrane, unenclosed DNA, paired 70S ribosome glyphs and shortened peritrichous flagella. It has no eukaryotic organelles.

The **neuron** has its own multipolar silhouette: branching dendrites, a cutaway soma/nucleus with simplified Nissl substance and mitochondria, a continuous shortened unmyelinated axon, and terminal branches. It is not a complete brain-region reconstruction; glia, molecular channels and synaptic partners are omitted.

The **mature human red blood cell** is a biconcave disc, with no nucleus, ER, Golgi, ribosomes or mitochondria. A transparent display sector exposes enlarged hemoglobin glyphs and a simplified membrane skeleton; the central depression is not a hole. Geometry tests check that the skeleton stays beneath the membrane.

Repeated small structures are instanced. Static geometry is merged by material/selection group. Model/quality replacement disposes geometry, materials and instance buffers; repeated switching is tested for stable geometry counts. Balanced mammalian rendering uses approximately 659k triangles and 42 draw calls in the tested overview; plant and yeast are denser and performance is device-dependent. DPR caps are 1.0 / 1.5 / 1.75 for efficient / balanced / detailed. Curve tessellation changes with quality. Scene rendering is skipped in hidden tabs.

## Scientific and technical limits

This is an educational illustration, **not a measured reconstruction, molecular simulation, or independently validated scientific model**. False colors, illustrative counts/placement, simplified membrane topology, enlarged molecular features, and exaggerated membrane spacing are declared in the UI. No exact scale bar is provided. Chromatin is interphase fiber-like material, not mitotic X-shaped chromosomes. There are no Golgi-lumen ribosomes. Photosynthetic plant features are confined to the plant model; fungal features specifically describe budding yeast. Counts and proportions are not comparisons of real cell sizes across taxa.

The cell boundaries, nuclei and selected organelles have permanent display windows. Shared organelle morphology is reused where appropriate with taxon-specific layout and field notes. Plant and yeast organelles and free-ribosome centers are checked against the vacuole lumen; this is an illustration invariant, not a full collision-free molecular packing simulation. The section slider clips surfaces without filling/capping exposed volumes. Cristae and ER topology are visual approximations, not watertight segmented biological meshes. Cytoskeletal paths do not represent a reconstructed molecular network. Endosomal intraluminal vesicles illustrate one morphology. Detailed photorealistic molecular packing, diffusion, and live cell dynamics are outside scope.

Automated science checks verify **metadata and generated-geometry invariants**, not biological accuracy. Independent biological review remains valuable. Mobile viewport and touch emulation ran on an Apple M4 GPU; performance on physical iPhones/Android devices and Safari was not measured. Decorative Google Fonts require network access; Georgia/Arial fallbacks preserve usability offline. No analytics or application backend.

## Files

- `src/data.js` — preserved mammalian descriptions, disclaimers, reference mapping and seed.
- `src/models.js` — six-model registry, scoped biology, reference library, captions and labels.
- `src/walled-cell.js` — plant/yeast outlines, layouts, vacuoles, chloroplasts and bud structures.
- `src/cell.js` — deterministic procedural meshes, instancing, geometry/material grouping.
- `src/main.js` — cell renderer, selection, controls, dialogs, fallback, diagnostics.
- `src/specialized-models.js`, `src/specialized-cell.js` — scoped new specimen notes and independent geometry generators.
- `atoms.html`, `src/atoms-main.js`, `src/atoms.css` — separate periodic-table entry and accessible element dialog.
- `src/elements.js`, `src/element-records.json` — sourced neutral-atom configurations, isotope choices and table positions.
- `src/atom.js`, `src/atom-viewer.js` — disposable atom geometry and interactive viewer.
- `DATA-SOURCES.md`, `scripts/prepare-elements.py` — provenance, source notices and reproducible factual extraction.
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
