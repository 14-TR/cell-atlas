"""Freeze the complete source candidate outside the mutable worktree, without staging.
Evidence and ignored build/dependency files are deliberately not source candidates.
Run after the last code edit, before final gates; verify the manifest afterward.
"""
from pathlib import Path
import hashlib
import json
import shutil
import stat
import subprocess
import tarfile
import tempfile

root = Path(__file__).resolve().parent.parent

def git(*args):
    return subprocess.check_output(['git', *args], cwd=root).decode().strip()

paths = sorted(set(git('ls-files').splitlines() + git('ls-files', '--others', '--exclude-standard').splitlines()))
paths = [p for p in paths if p and not p.startswith('evidence/')]
changed = sorted(set(git('diff', '--name-only', 'HEAD').splitlines() + git('ls-files', '--others', '--exclude-standard').splitlines()))
changed = [p for p in changed if p and not p.startswith('evidence/')]
records = []
folder = Path(tempfile.mkdtemp(prefix='cell-atlas-review-'))
candidate = folder / 'candidate'
for rel in paths:
    path = root / rel
    if not path.exists():
        records.append(dict(path=rel, deleted=True))
        continue
    assert path.is_file() and not path.is_symlink(), rel
    target = candidate / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, target)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    assert hashlib.sha256(target.read_bytes()).hexdigest() == digest
    records.append(dict(path=rel, mode=stat.S_IMODE(path.stat().st_mode), sha256=digest, bytes=path.stat().st_size))
identity = hashlib.sha256(json.dumps(records, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
archive = folder / 'candidate.tar.gz'
with tarfile.open(archive, 'w:gz') as tar:
    tar.add(candidate, arcname='cell-atlas')
manifest = dict(base=git('rev-parse', 'HEAD'), sourceIdentity=identity, archive=str(archive), archiveSHA256=hashlib.sha256(archive.read_bytes()).hexdigest(), frozenDirectory=str(candidate), changedPaths=changed, files=records)
output = root / 'evidence/expansion/candidate.json'
output.write_text(json.dumps(manifest, indent=2)+'\n')
(folder/'candidate.json').write_text(output.read_text())
print(json.dumps({k:v for k,v in manifest.items() if k!='files'}, indent=2))
