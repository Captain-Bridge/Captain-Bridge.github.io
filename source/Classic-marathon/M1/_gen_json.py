import os, json

base = 'text'
levels = sorted(os.listdir(base))
result = []
img_idx = 1601  # 01600 reserved for LOGON/LOGOFF

for lv in levels:
    lv_path = os.path.join(base, lv)
    if not os.path.isdir(lv_path):
        continue

    lv_id = lv[:2]
    lv_name = lv[3:]
    terminals = sorted(os.listdir(lv_path))
    lv_entry = {
        'id': lv_id,
        'name': lv_name,
        'terminals': []
    }

    for tm in terminals:
        tm_path = os.path.join(lv_path, tm)
        if not os.path.isdir(tm_path):
            continue
        files = sorted(os.listdir(tm_path))
        txts = [f for f in files if f.endswith('.txt')]

        logon = next((f for f in txts if 'LOGON' in f), None)
        info  = next((f for f in txts if 'INFORMATION' in f), None)
        logoff= next((f for f in txts if 'LOGOFF' in f), None)
        picts_raw = sorted([f for f in txts if 'PICT' in f])

        picts = []
        for p in picts_raw:
            picts.append({
                'file': p,
                'image': f'{img_idx:05d}.bmp'
            })
            img_idx += 1

        lv_entry['terminals'].append({
            'name': tm,
            'logon': logon,
            'information': info,
            'logoff': logoff,
            'picts': picts if picts else []
        })

    result.append(lv_entry)

output = {
    'meta': {
        'description': 'Marathon M1 scenario — terminal files mapped to images',
        'logon_logoff_image': '01600.bmp',
        'total_picts': img_idx - 1601,
        'total_images': img_idx - 1600
    },
    'levels': result
}

with open('terminals.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f'Generated terminals.json with {len(result)} levels')
print(f'PICT entries: {img_idx - 1601}')
print(f'Image range: 01600 - {(img_idx - 1):05d}')
