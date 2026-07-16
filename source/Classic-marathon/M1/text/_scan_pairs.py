import os

root = r'C:\codes\myblog\source\Classic-marathon\M1\text'

pairs = {
    'B': ('$B', '$b'),
    'U': ('$U', '$u'),
    'I': ('$I', '$i'),
}

results = []

for dirpath, dirnames, filenames in os.walk(root):
    for fname in filenames:
        if not fname.endswith('.txt'):
            continue
        if fname in ('_scan_result.txt',):
            continue
        filepath = os.path.join(dirpath, fname)
        relpath = os.path.relpath(filepath, root)
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()

        for kind, (open_tag, close_tag) in pairs.items():
            stack = []
            i = 0
            lineno = 1
            col = 1
            while i < len(content):
                ch = content[i]
                if content[i:i+2] == open_tag:
                    stack.append((lineno, col, i))
                    i += 2
                    col += 2
                    continue
                if content[i:i+2] == close_tag:
                    if stack:
                        stack.pop()
                    else:
                        results.append((relpath, kind, lineno, col,
                            f'extra {close_tag}, no matching {open_tag}'))
                    i += 2
                    col += 2
                    continue
                if ch == '\n':
                    lineno += 1
                    col = 1
                else:
                    col += 1
                i += 1

            for (sl, sc, si) in stack:
                ctx_end = min(len(content), si + 80)
                ctx = content[si:ctx_end].replace('\n', '\\n').replace('\r', '')
                results.append((relpath, kind, sl, sc,
                    f'unclosed {open_tag}: {ctx}'))

out_path = os.path.join(root, '_scan_result.txt')
with open(out_path, 'w', encoding='utf-8') as out:
    if not results:
        out.write('No unclosed symbol pairs found.\n')
    else:
        out.write(f'Total issues: {len(results)}\n\n')
        current_file = None
        for relpath, kind, lineno, col, detail in sorted(results):
            if relpath != current_file:
                if current_file is not None:
                    out.write('\n')
                current_file = relpath
                out.write(f'=== {relpath} ===\n')
            out.write(f'  [{kind}] L{lineno}:C{col} - {detail}\n')

print(f'Done. Total issues: {len(results)}')