"""Freeze animation sources, build and receipts outside the worktree; never stage.
Historical expansion evidence is never a write target. Run after final gates.
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
    return subprocess.check_output(['git', *args], cwd=root)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def names(*args):
    return [p.decode() for p in git(*args).split(b'\0') if p]

tracked = names('ls-files', '-z')
untracked = names('ls-files', '--others', '--exclude-standard', '-z')
# Include the complete tracked tree and owned new source files; mutable runtime
# evidence is archived separately, not silently mixed into the source identity.
paths = sorted(set(tracked + [p for p in untracked if not p.startswith('evidence/')]))
changed = sorted(set(names('diff', '--name-only', '-z', 'HEAD') + [p for p in untracked if not p.startswith('evidence/')]))
folder = Path(tempfile.mkdtemp(prefix='cell-atlas-animation-review-'))
candidate = folder / 'candidate'

def copy_files(source, destination, files):
    records = []
    for rel in files:
        path = source / rel
        if not path.exists():
            records.append(dict(path=rel, deleted=True))
            continue
        assert path.is_file() and not path.is_symlink(), rel
        target = destination / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)
        sha = digest(path)
        assert digest(target) == sha, rel
        records.append(dict(path=rel, mode=stat.S_IMODE(path.stat().st_mode), sha256=sha, bytes=path.stat().st_size))
    return records

records = copy_files(root, candidate, paths)
identity = hashlib.sha256(json.dumps(records, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
(folder / 'candidate.patch').write_bytes(git('diff', '--binary', 'HEAD'))
(folder / 'status.txt').write_bytes(git('status', '--short'))
build_paths = sorted(str(p.relative_to(root / 'dist')) for p in (root / 'dist').rglob('*') if p.is_file())
build = copy_files(root / 'dist', folder / 'dist', build_paths)
evidence_root = root / 'evidence/animation'
evidence_paths = sorted(str(p.relative_to(evidence_root)) for p in evidence_root.rglob('*')
                        if p.is_file() and not p.is_symlink() and p.name not in {'candidate.json', 'freeze.txt'})
evidence = copy_files(evidence_root, folder / 'evidence/animation', evidence_paths)
archive = folder / 'candidate.tar.gz'
with tarfile.open(archive, 'w:gz') as tar:
    tar.add(candidate, arcname='cell-atlas')
manifest = dict(base=git('rev-parse', 'HEAD').decode().strip(), sourceIdentity=identity,
                frozenDirectory=str(candidate), archive=str(archive), archiveSHA256=digest(archive),
                changedPaths=changed, files=records, builtFiles=build, evidenceFiles=evidence)
(folder / 'candidate.json').write_text(json.dumps(manifest, indent=2) + '\n')
(evidence_root / 'candidate.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({k:v for k,v in manifest.items() if k not in {'files','builtFiles','evidenceFiles'}}, indent=2))
print(f'Manifest: {folder / "candidate.json"}')
