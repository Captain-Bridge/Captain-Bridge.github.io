import json
import re
import shutil
from pathlib import Path
from zipfile import ZipFile
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'source' / 'Classic-marathon' / 'M3'
ZIP = ROOT / 'M3.zip'

def image_mask(path):
    pixels = np.asarray(Image.open(path).convert('RGB'))
    return (pixels.max(axis=2) > 40).astype(float)

def match_image(render_path, candidates):
    source = image_mask(render_path)
    scored = []
    for candidate in candidates:
        template = image_mask(candidate)
        height, width = template.shape
        shape = (source.shape[0] + height - 1, source.shape[1] + width - 1)
        source_fft = np.fft.rfftn(source, shape, axes=(0, 1))
        overlap = np.fft.irfftn(source_fft * np.fft.rfftn(template[::-1, ::-1], shape, axes=(0, 1)), shape, axes=(0, 1))
        window_sum = np.fft.irfftn(source_fft * np.fft.rfftn(np.ones_like(template), shape, axes=(0, 1)), shape, axes=(0, 1))
        valid = (slice(height - 1, source.shape[0]), slice(width - 1, source.shape[1]))
        mismatch = template.sum() + window_sum[valid] - 2 * overlap[valid]
        scored.append((1 - float(mismatch.min()) / template.size, candidate.name))
    return max(scored)[1] if scored else None

def main():
    raw = ROOT / '_raw'
    if raw.exists(): shutil.rmtree(raw)
    with ZipFile(ZIP) as archive:
        archive.extractall(raw)
    levels = []
    for level_dir in sorted(raw.iterdir()):
        if not level_dir.is_dir() or not re.match(r'^\d{2} ', level_dir.name): continue
        level_id, level_name = level_dir.name.split(' ', 1)
        terminals = []
        for terminal_dir in sorted(level_dir.glob('Terminal_*'), key=lambda p: int(p.name.split('_')[1])):
            variants = []
            for variant in ('UNFINISHED', 'FINISHED'):
                files = sorted(terminal_dir.glob(variant + '_*.txt'))
                if not files: continue
                variants.append(variant)
            if not variants: continue
            default = variants[0]
            def data(variant):
                files = sorted(terminal_dir.glob(variant + '_*.txt'))
                picts = []
                candidates = sorted((terminal_dir / 'picts').glob('*.bmp'))
                for f in files:
                    m = re.match(r'.+_\d{3}_PICT\.txt$', f.name)
                    if m:
                        render = terminal_dir / 'renders' / (f.stem + '.png')
                        picts.append({'file': f.name, 'image': match_image(render, candidates) if render.exists() else None})
                logon = next((f.name for f in files if '_LOGON.txt' in f.name), None)
                logoff = next((f.name for f in files if '_LOGOFF.txt' in f.name), None)
                logon_render = terminal_dir / 'renders' / (logon.replace('.txt', '.png') if logon else '')
                logoff_render = terminal_dir / 'renders' / (logoff.replace('.txt', '.png') if logoff else '')
                return {
                    'logon': logon,
                    'logonImage': match_image(logon_render, candidates) if logon and logon_render.exists() else None,
                    'picts': picts,
                    'logoff': logoff,
                    'logoffImage': match_image(logoff_render, candidates) if logoff and logoff_render.exists() else None,
                    'defaultColor': '$C0'
                }
            terminals.append({'name': terminal_dir.name, 'variants': variants, 'defaultVariant': default, **data(default), 'variantData': {v: data(v) for v in variants}})
        levels.append({'id': level_id, 'name': level_name, 'terminals': terminals})
    out = {'meta': {'description': 'Marathon Infinity terminal files', 'total_levels': len(levels), 'total_terminals': sum(len(x['terminals']) for x in levels)}, 'levels': levels}
    (ROOT / 'terminals.json').write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    # Match M2's published layout.
    for sub in ('text', 'picts', 'renders'):
        (ROOT / sub).mkdir(exist_ok=True)
    for level in levels:
        src_level = raw / (level['id'] + ' ' + level['name'])
        for term in level['terminals']:
            src = src_level / term['name']
            rel = Path(level['id'] + ' ' + level['name']) / term['name']
            (ROOT / 'text' / rel).mkdir(parents=True, exist_ok=True)
            (ROOT / 'renders' / rel).mkdir(parents=True, exist_ok=True)
            for f in src.glob('*.txt'): shutil.copy2(f, ROOT / 'text' / rel / f.name)
            for f in (src / 'picts').glob('*'): shutil.copy2(f, ROOT / 'picts' / f.name)
            for f in (src / 'renders').glob('*'): shutil.copy2(f, ROOT / 'renders' / rel / f.name)
    shutil.rmtree(raw)

if __name__ == '__main__': main()
