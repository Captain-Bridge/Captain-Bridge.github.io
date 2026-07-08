import os, json

base = 'text'
levels = sorted(os.listdir(base))
result = []

for lv in levels:
    lv_path = os.path.join(base, lv)
    if not os.path.isdir(lv_path): continue
    terminals = sorted(os.listdir(lv_path))
    lv_entry = {'level': lv, 'terminals': []}
    for tm in terminals:
        tm_path = os.path.join(lv_path, tm)
        if not os.path.isdir(tm_path): continue
        files = sorted(os.listdir(tm_path))
        txts = [f for f in files if f.endswith('.txt')]
        picts = [f for f in txts if 'PICT' in f]
        lv_entry['terminals'].append({
            'name': tm,
            'files': txts,
            'pict_count': len(picts)
        })
    result.append(lv_entry)

print(json.dumps(result, indent=2, ensure_ascii=False))
