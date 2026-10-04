"""Rebuild the factual element subset from downloaded public source snapshots.
Usage: python3 scripts/prepare-elements.py PUBCHEM.json NIST-isotopes.html NIST-Lr.csv
No remote requests or guessed configurations. See DATA-SOURCES.md.
"""
import csv
import hashlib
import json
from pathlib import Path
import re
import sys

pubchem, isotopes, lr = map(Path, sys.argv[1:])
raw = json.loads(pubchem.read_text())['Table']
rows = [dict(zip(raw['Columns']['Column'], row['Cell'])) for row in raw['Row']]
assert len(rows) == 118
isotope_rows = re.findall(r'Atomic Number = (\d+)\s+Atomic Symbol = (\w+)\s+Mass Number = (\d+)\s+Relative Atomic Mass = ([^\n]*)\s+Isotopic Composition = ([^\n]*)', isotopes.read_text())
lr_row = list(csv.reader(lr.read_text().splitlines()))[1]
assert lr_row[3] == '="[Rn].5f14.7s2.7p"'
records = []
for row in rows:
    z = int(row['AtomicNumber'])
    choices = [r for r in isotope_rows if int(r[0]) == z]
    assert choices, z
    natural = [r for r in choices if re.match(r'^\d', r[4])]
    chosen = max(natural, key=lambda r: float(r[4].split('(')[0])) if natural else choices[0]
    records.append(dict(number=z, symbol=row['Symbol'], name=row['Name'], family=row['GroupBlock'],
                        configuration=row['ElectronConfiguration'] if z != 103 else '[Rn]5f14 7s2 7p1',
                        massNumber=int(chosen[2]), isotopeBasis='most abundant in NIST composition table' if natural else 'selected isotope listed by NIST; no natural-abundance claim',
                        isotopeEstimated='#' in chosen[3]))
# NIST's 2015 short table lists an estimated Ts-292; use the documented observed
# isotope Ts-294 instead (IUPAC 2022 periodic table), not a rounded atomic weight.
records[116].update(massNumber=294, isotopeBasis='selected isotope in IUPAC 2022 periodic table', isotopeEstimated=False)
Path('src/element-records.json').write_text(json.dumps(records, indent=2)+'\n')
Path('tests/fixtures/element-sources').mkdir(parents=True, exist_ok=True)
for name, path in [('pubchem.json', pubchem), ('nist-isotopes.html', isotopes), ('nist-lr.csv', lr)]:
    Path('tests/fixtures/element-sources', name).write_bytes(path.read_bytes())
print(json.dumps({'elements':len(records),'inputs':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [pubchem,isotopes,lr]}},indent=2))
