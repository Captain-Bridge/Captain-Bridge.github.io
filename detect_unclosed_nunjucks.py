import os

# 根目录（改成你的博客路径）
root_dir = r"C:\codes\myblog"

def find_unclosed_comments(file_path):
    unclosed_lines = []
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        for i, line in enumerate(f, start=1):
            # 如果这一行里有 "{#" 但是没有 "#}"
            if "{#" in line and "#}" not in line:
                unclosed_lines.append((i, line.strip()))
    return unclosed_lines

for root, _, files in os.walk(root_dir):
    for file in files:
        if file.endswith((".md", ".njk", ".html", ".yml", ".yaml")):
            path = os.path.join(root, file)
            issues = find_unclosed_comments(path)
            if issues:
                print(f"\n⚠️ 文件: {path}")
                for line_no, line in issues:
                    print(f"  第 {line_no} 行: {line}")
