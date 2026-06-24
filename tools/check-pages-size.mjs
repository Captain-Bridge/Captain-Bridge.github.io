import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? "public");
const maxMb = Number(process.env.PAGES_MAX_SIZE_MB ?? 900);
const warnMb = Number(process.env.PAGES_WARN_SIZE_MB ?? Math.min(850, maxMb));

async function walk(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walk(fullPath, files);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const fileStat = await stat(fullPath);
    files.push({
      path: fullPath,
      size: fileStat.size,
      ext: path.extname(entry.name).toLowerCase() || "[no ext]",
    });
  }

  return files;
}

function formatMb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const files = await walk(root);
const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
const totalMb = totalBytes / (1024 * 1024);

console.log(`Pages artifact: ${formatMb(totalBytes)} across ${files.length} files`);

const byExtension = new Map();
for (const file of files) {
  byExtension.set(file.ext, (byExtension.get(file.ext) ?? 0) + file.size);
}

console.log("Top extensions by size:");
for (const [ext, bytes] of [...byExtension.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
  console.log(`  ${ext}: ${formatMb(bytes)}`);
}

console.log("Largest files:");
for (const file of files.sort((a, b) => b.size - a.size).slice(0, 15)) {
  console.log(`  ${formatMb(file.size)}  ${path.relative(root, file.path)}`);
}

if (totalMb > maxMb) {
  console.error(
    `Pages artifact exceeds the ${maxMb} MB safety limit. Reduce large assets or move them off GitHub Pages before deploying.`,
  );
  process.exit(1);
}

if (totalMb > warnMb) {
  console.warn(
    `Pages artifact is above the ${warnMb} MB warning threshold and may deploy slowly or time out on GitHub Pages.`,
  );
}
