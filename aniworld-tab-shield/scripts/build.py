"""Build unpacked extensions and reproducible ZIPs using only Python's stdlib."""
from pathlib import Path
import json
import shutil
import zipfile
ROOT = Path(__file__).resolve().parents[1]
for browser in ('chromium', 'firefox'):
    target = ROOT / 'dist' / browser
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True)
    manifest = json.loads((ROOT / 'manifests' / (browser + '.json')).read_text())
    (target / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    for source in sorted((ROOT / 'src').glob('*.js')):
        if browser == 'firefox' and source.name == 'service-worker.js':
            continue
        shutil.copyfile(source, target / source.name)
    archive = ROOT / 'dist' / f"aniworld-{browser}-{manifest['version']}.zip"
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as out:
        for source in sorted(target.iterdir()):
            info = zipfile.ZipInfo(source.name, (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            out.writestr(info, source.read_bytes())
    print(archive.relative_to(ROOT))
