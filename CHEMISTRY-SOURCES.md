# Chemistry Lab — sources and limits

## Finite coverage

The shipped offline catalog has **96 neutral compound records / 92 distinct exact compositions**, with **118 selectable elements**. Categories are a browsing aid, not a claim about phase, solution behavior, safety or stability:

| Catalog category | Records |
|---|---:|
| Salts | 35 |
| Oxides / related oxygen compounds | 17 |
| Acids | 12 |
| Bases | 6 |
| Organic compounds | 26 |

The **30 curated balanced equations** comprise 5 combination, 3 oxidation, 4 decomposition, 5 precipitation, 8 acid–base and 5 displacement examples. These categories overlap chemically; each equation is assigned one primary browsing category. Equation facts follow the cited OpenStax examples.[1][2][3]
Limiting-reactant calculations use the source's stoichiometric method.[6]
The hydrogen/oxygen water-formation equation also appears in the enthalpy section.[105]

No arbitrary product prediction is implemented. A formula is not proof of a unique compound, structure, stability, phase, spontaneous synthesis or practical reaction. Exact matches are not reduced to empirical ratios. Ethanol and dimethyl ether share a formula.[87][88]
The two propanol records share another formula.[89][90]
Glucose, fructose and galactose also share a formula.[95][96][97]
Such compositions remain ambiguous unless the user explicitly chooses a named record.

## Provenance and integrity

- `src/chemistry/compound-records.json`: each record carries a PubChem CID, original retrieval URL, per-compound source URL, fixture filename and SHA-256. Formula facts are taken from actual PUG REST responses, not generated from names. For example, water is CID 962 and sodium chloride is CID 5234.[44][7]
- `tests/fixtures/chemistry-sources/*.json`: original PubChem property responses. Unit tests hash every included fixture and compare CID and exact composition against the shipped record. Conventional ordering/grouping may be changed only when the parsed composition is identical.
- `tests/fixtures/chemistry-sources/reaction-provenance.json`: every equation has its exact source MathML index, source-page hash, MathML hash, source text and literal transcription. Unit tests bind each equation to the actual source fragment and independently conserve every atom and net charge.
- `scripts/build-chemistry-catalog.js` regenerates the catalog from retained retrieval receipts. `scripts/build-chemistry-reactions.py` checks each manually curated equation against its retrieved source text before generating records. No missing query becomes a synthetic record.
- `evidence/chemistry/collect-sources.py` and `retrieved-compounds.json` preserve acquisition. One query (`iron(III) oxide`) returned HTTP 404 and was not included. Two name queries returned inappropriate charged records (`sodium phosphate`: `NaO4P-2`; `sodium sulfide`: `HNa2S+`) and were excluded, not silently corrected. The original responses and exclusions remain available.
- The existing element dataset remains unchanged; its separate source integrity checks continue to apply.

## Visualization contract

Water uses a bent layout with the source's approximately 104.5° angle; carbon dioxide is linear, methane tetrahedral and ammonia trigonal pyramidal with illustrative bond directions. These are teaching layouts, not measured coordinates.[4]

Sodium chloride is an alternating-ion fragment, not a discrete NaCl molecule. The displayed fragment has 32 Na⁺ and 32 Cl⁻ markers; an interior ion has six opposite-charge neighbors. That repeating 1:1 ratio is explicitly distinguished from the builder's atom counts.[5]

All other records and unresolved formula ambiguities use unbonded **composition-only** arrangements. At most 72 of the builder's maximum 240 atoms are drawn; the truncation is labeled and exact counts remain in the reading UI. Per-element counts range from 0 to 99. The neutral builder rejects charged formulas; the underlying parser supports explicit charged species for sourced ionic equations.

Reaction animation preserves each element marker from the reactant inventory to the product inventory in **one balanced-equation packet**, independent of the virtual mol amounts. Group locations and trajectories are bookkeeping, not molecular geometry or mechanism. No arbitrary covalent bonds are added to reaction groups. Actual conversion and leftovers are reported separately using continuous virtual mol values (0–100 for each reactant). Complete conversion of the limiting reactant is an ideal stoichiometric assumption, not a yield/equilibrium claim.[6]

Only on-screen simulation is provided. No temperatures, apparatus, activation methods or experimental procedure are given. Dangerous substances appear only as textbook equation facts. No safety suitability is implied.

## Optional PubChem lookup

`src/chemistry/lookup.js` uses public `fastformula/.../cids/JSON?MaxRecords=12`, then retrieves formula/name properties for those CIDs and rechecks exact neutral compositions locally. This is bounded to 12 retrieved records and is **not exhaustive**; a single returned record is never treated as a unique structure. No new 3D structures are inferred from results. Lookup results are not added to the verified offline catalog.

`evidence/chemistry/live-pubchem-probe.json` records actual browser CORS requests. Both fast-formula search and property lookup returned HTTP 200 in Chromium from the owned loopback origin. The integrated browser test also exercises the real public lookup, then forces the browser offline and verifies retained offline facts and the public PubChem search link. This establishes the tested environment, not a guarantee of future uptime, rate limits or every origin/browser. The fetch has a full-operation deadline, cancellation and stale-response protection. No proxy/backend, credentials, cookies, persistent cache or arbitrary remote URLs are used.

The source catalog and all reaction calculations work without network access **after the static app has loaded**. There is no service worker or promise of an offline first navigation.

## Rights and attribution

PubChem aggregates contributions under source-specific rights; factual identity/formula subsets are attributed by CID and retrieval URL. No blanket Creative Commons license is claimed for PubChem contributions.

The retrieved OpenStax pages identify **Creative Commons Attribution–NonCommercial–ShareAlike 4.0**, not the older blanket CC BY description. Retained OpenStax source snapshots and excerpts remain under those source terms; this project does not relicense them. Scientific formula/equation facts are transcribed with source links, while UI explanations and Three.js artwork are original. No textbook illustration, logo or trademark is reused in the app. Any downstream reuse of source expressive material must follow its license; do not assume commercial rights. OpenStax states additional conditions for use in AI offerings on its source pages.

**OpenStax attribution:** Access for free at https://openstax.org/books/chemistry-2e/pages/1-introduction. Chemistry 2e, OpenStax / Rice University. License shown in retrieved pages: https://creativecommons.org/licenses/by-nc-sa/4.0/.[1]

## Local verification

```sh
export PATH=/Users/tr/.hermes/node/bin:$PATH
npm test
npm run build
# Always choose a fresh evidence directory; do not overwrite historical receipts.
CHEMISTRY_EVIDENCE=evidence/chemistry/my-fresh-run node tests/chemistry-browser.js
node scripts/verify-chemistry-regressions.js
ANIMATION_EVIDENCE=evidence/chemistry/my-fresh-animation node tests/animation-browser.js
```

The chemistry browser harness owns an ephemeral port, serves the real production `/cell-atlas/` subpath, verifies entry bytes and uses Chromium with `--use-angle=metal`. UI, all offline records, all selectable elements, all curated reactions, actual GPU motion, paused pixels, touch orbit/pinch, reduced motion, disposal, context loss and no-WebGL reading fallback are covered. Physical iPhone/Safari testing is not claimed. Independent review and publication are separate parent-agent gates; this candidate must not be committed or pushed by the implementer.

## Sources

[1] https://openstax.org/books/chemistry-2e/pages/4-1-writing-and-balancing-chemical-equations — OpenStax Chemistry 2e 4-1-writing-and-balancing-chemical-equations
[2] https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions — OpenStax Chemistry 2e 4-2-classifying-chemical-reactions
[3] https://openstax.org/books/chemistry-2e/pages/4-exercises — OpenStax Chemistry 2e 4-exercises
[4] https://openstax.org/books/chemistry-2e/pages/7-6-molecular-structure-and-polarity — OpenStax Chemistry 2e 7-6-molecular-structure-and-polarity
[5] https://openstax.org/books/chemistry-2e/pages/10-6-lattice-structures-in-crystalline-solids — OpenStax Chemistry 2e 10-6-lattice-structures-in-crystalline-solids
[6] https://openstax.org/books/chemistry-2e/pages/4-4-reaction-yields — OpenStax Chemistry 2e 4-4-reaction-yields
[7] https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/sodium%20chloride/property/MolecularFormula,IUPACName/JSON — PubChem formula: sodium chloride
[44] https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/water/property/MolecularFormula,IUPACName/JSON — PubChem formula: water
[87] https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/ethanol/property/MolecularFormula,IUPACName/JSON — PubChem formula: ethanol
[88] https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/dimethyl%20ether/property/MolecularFormula,IUPACName/JSON — PubChem formula: dimethyl ether
[89] https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/1-propanol/property/MolecularFormula,IUPACName/JSON — PubChem formula: 1-propanol
[90] https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/2-propanol/property/MolecularFormula,IUPACName/JSON — PubChem formula: 2-propanol
[95] https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/glucose/property/MolecularFormula,IUPACName/JSON — PubChem formula: glucose
[96] https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/fructose/property/MolecularFormula,IUPACName/JSON — PubChem formula: fructose
[97] https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/galactose/property/MolecularFormula,IUPACName/JSON — PubChem formula: galactose
[105] https://openstax.org/books/chemistry-2e/pages/5-3-enthalpy — OpenStax Chemistry 2e Enthalpy
