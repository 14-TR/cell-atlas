# Scientific sources and third-party data

## Cell specimens

The bacterial specimen is a **motile, vegetative Escherichia coli**, not a generic bacterium: a Gram-negative rod with an inner membrane, periplasmic peptidoglycan, outer membrane, an unenclosed nucleoid, 70S ribosomes and peritrichous flagella. Capsule, pili, optional plasmids, division and molecular surface detail are omitted. Morphology, counts and layer spacing are illustrative.[1]

The neuron is a **generalized mammalian multipolar neuron with an unmyelinated, shortened axon**. The soma, nucleus, Nissl substance, sample mitochondria, dendritic tree and terminal arbor are deliberately simplified. Myelin belongs to glial cells where present; no glial cell or synaptic partner is reconstructed here. The soma membrane toggle does not hide the separately selectable branch surfaces.[2]

The erythrocyte is a **normal mature human red blood cell**, not a reticulocyte, bird erythrocyte or disease model. Its biconcave disc has a depressed center, not a central hole. Hemoglobin carries oxygen; the membrane skeleton supports deformation. The mature cell lacks a nucleus and the protein-synthesis organelles of the original mammalian model. An artificial transparent sector reveals enlarged hemoglobin glyphs and a schematic membrane skeleton.[3][4]

All prose and geometry were written for this project; source illustrations were not copied. Full biological validation by an independent expert remains outside the automated tests.

## Elements: factual snapshot, not an Aufbau guess

`src/element-records.json` is a compact factual subset of the NIH PubChem periodic-table JSON: atomic number, symbol, name, family and neutral ground-state configuration. PubChem's element pages expose the contributing sources; the inspected iron configuration is attributed to Los Alamos National Laboratory. The snapshot was fetched on **2026-10-04 UTC**.[5][9]

`src/elements.js` expands noble-gas cores and sums subshell occupations by principal quantum number. It does **not** fill shells sequentially using their capacities. Thus Cr, Cu, Nb, Mo, Ru, Rh, Pd, Ag, La, Ce, Gd, Pt, Au and the actinide exceptions retain the occupations in the source. The one configuration override is **Lawrencium: [Rn]5f14 7s2 7p1**, following NIST ASD rather than the older PubChem/LANL 6d entry.[5][6]

The UI flags configurations for Z ≥ 104 as theoretical/predicted; PubChem explicitly tags its Z ≥ 109 entries calculated/predicted. These are the source's educational configuration conventions, not a claim of spectroscopic measurement for every superheavy atom.[5]

Table placement uses the conventional 18-column presentation with La–Lu and Ac–Lr detached below the body and explicit non-button placeholders. The f-block rows have their actual period retained in the element data. This layout does not claim to resolve group 3 membership.[8]

## Isotopes and neutrons

The isotope choice is independent of PubChem's atomic-weight column:

- If NIST's frozen composition table supplies natural abundances, select the isotope with the largest listed composition.
- Otherwise select the first isotope listed in its short table. This is a **representative listed isotope**, not a claim of natural abundance, stability, most-common production or longest half-life.
- If NIST marks the listed isotope mass with `#`, retain an explicit estimated-mass caveat.
- Use **Ts-294** from the IUPAC 2022 table instead of the estimated Ts-292 in the older NIST short table. The IUPAC PDF was fetched and visually checked; its Ts and Og entries both show isotope mass number 294.[7][8]

Neutrons are the integer mass number minus atomic number. The model never obtains a neutron count by rounding average atomic weight. The representative isotope is named alongside the counts; other isotopes of the element have different neutron counts. Isotope selection does not imply that any radioactive atom is stable.[7]

## Model interpretation

The 3D atom shows one marker per electron and one per proton/neutron for the named neutral isotope. Ring radii, marker placements and nucleus packing are an original educational drawing: **not to scale, not literal electron trajectories, not orbital wavefunctions, not a nuclear-structure calculation**. The whole model can rotate, but individual electrons are not animated as classical orbiting planets. Charge states, bonding, excitation and decay are outside scope.

## Reuse / license notices

The project's original-code license remains `LICENSE`. Third-party factual data retain their source notices and are not relicensed as project-owned data. PubChem makes the table machine-readable and downloadable, but does not give all contributions one blanket Creative Commons license.[9]

- **LANL**: its linked web policies identify Triad National Security, LLC copyright and U.S. Government rights. Do not describe the entire LANL site as public domain merely because it is a `.gov` site. This project extracts factual configuration strings, not LANL prose or artwork.[10]
- **NIST**: its terms distinguish U.S. Government employee works from copyrighted Standard Reference Data compilations. Preserve NIST attribution, the database disclaimer and the source-specific notice; this project does not claim that all NIST material is CC0. ASD is cited for the Lr ground configuration; the isotope-composition database credits its own underlying evaluations.[7][11]
- **IUPAC**: the 2022 table is © IUPAC. Only the factual Ts-294 selection and conventional element arrangement are used; neither the PDF nor its artwork is bundled into the application.[8]
- The test-only NIST HTML fixture is **inert source evidence**, read as text by Node/Python. It is not an application entry point and is not included in `dist/`.

No data provider endorses Cell Atlas. These notices document provenance and rights rather than asserting a new open license over a third-party compilation.

## Reproduce and verify offline

```sh
python3 scripts/prepare-elements.py \
  tests/fixtures/element-sources/pubchem.json \
  tests/fixtures/element-sources/nist-isotopes.html \
  tests/fixtures/element-sources/nist-lr.csv
npm test
```

The source fixtures are protected by literal SHA-256 assertions in `tests/elements.test.js`. Tests check every source configuration (with the documented Lr override), all 118 table positions against a separate literal layout, every selected NIST isotope, integer particle totals and independent exception/shell examples. The source download URLs were:

- `https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON`
- `https://physics.nist.gov/cgi-bin/Compositions/stand_alone.pl?ele=&all=all&ascii=ascii2&isotype=some`
- `https://physics.nist.gov/cgi-bin/ASD/ie.pl?spectra=Lr+I&units=1&format=2&order=0&at_num_out=on&sp_name_out=on&el_name_out=on&shells_out=on&level_out=on&e_out=0`

The NIST composition database's underlying evaluation is older than the fetch date. The snapshot date is not a claim that its isotope coverage was updated in 2026.

## Sources

[1] https://www.ncbi.nlm.nih.gov/books/NBK8477
[2] https://med.uth.edu/nba/nso/s1_cellular-molecular/ch-8-organization-of-cell-types
[3] https://www.ncbi.nlm.nih.gov/books/NBK2263/pdf/Bookshelf_NBK2263.pdf
[4] https://pmc.ncbi.nlm.nih.gov/articles/PMC11105037/pdf/18_2019_Article_3346.pdf
[5] https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON
[6] https://physics.nist.gov/PhysRefData/ASD/ionEnergy.html
[7] https://physics.nist.gov/PhysRefData/Compositions/index.html
[8] https://iupac.org/wp-content/uploads/2022/05/IUPAC_Periodic_Table-04May22.pdf
[9] https://pubchem.ncbi.nlm.nih.gov/periodic-table
[10] https://lanl.gov/lanl-resources/web-policies
[11] https://www.nist.gov/open/license
