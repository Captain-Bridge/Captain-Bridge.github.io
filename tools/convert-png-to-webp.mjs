import { readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const rootDir = process.cwd();
const sourceRoot = path.resolve(rootDir, "source");
const textRoots = [
  sourceRoot,
  path.resolve(rootDir, "_config.next.yml"),
];
const textExtensions = new Set([".css", ".html", ".js", ".json", ".yml", ".yaml"]);

async function walk(dir, predicate, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walk(fullPath, predicate, files);
      continue;
    }

    if (entry.isFile() && predicate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function toSitePath(filePath) {
  return `/${toPosixPath(path.relative(sourceRoot, filePath))}`;
}

function selectWebpOptions(filePath, metadata, bytes) {
  const normalizedPath = toPosixPath(filePath);
  const maxEdge = Math.max(metadata.width ?? 0, metadata.height ?? 0);

  if (metadata.hasAlpha) {
    return { lossless: true, effort: 6 };
  }

  if (normalizedPath.includes("/assets/images/icons/")) {
    return { lossless: true, effort: 6 };
  }

  if (bytes <= 128 * 1024 && maxEdge <= 512) {
    return { lossless: true, effort: 6 };
  }

  return {
    quality: 95,
    alphaQuality: 100,
    effort: 6,
    smartSubsample: true,
  };
}

function replaceAll(content, search, replacement) {
  return content.split(search).join(replacement);
}

async function listTextFiles() {
  const files = [];

  for (const target of textRoots) {
    const targetStat = await stat(target);

    if (targetStat.isDirectory()) {
      const nested = await walk(target, (filePath) => textExtensions.has(path.extname(filePath).toLowerCase()));
      files.push(...nested);
      continue;
    }

    files.push(target);
  }

  return files;
}

const pngFiles = await walk(sourceRoot, (filePath) => path.extname(filePath).toLowerCase() === ".png");
const replacements = [];
let totalOriginalBytes = 0;
let totalWebpBytes = 0;

for (const pngFile of pngFiles) {
  const image = sharp(pngFile, { animated: true });
  const metadata = await image.metadata();
  const originalBytes = (await stat(pngFile)).size;
  const webpFile = pngFile.replace(/\.png$/i, ".webp");
  const webpOptions = selectWebpOptions(pngFile, metadata, originalBytes);

  await image.webp(webpOptions).toFile(webpFile);

  const webpBytes = (await stat(webpFile)).size;
  totalOriginalBytes += originalBytes;
  totalWebpBytes += webpBytes;

  replacements.push({
    fromSitePath: toSitePath(pngFile),
    toSitePath: toSitePath(webpFile),
    fromSourcePath: toPosixPath(path.relative(sourceRoot, pngFile)),
    toSourcePath: toPosixPath(path.relative(sourceRoot, webpFile)),
    fromRelativePath: toPosixPath(path.relative(rootDir, pngFile)),
    toRelativePath: toPosixPath(path.relative(rootDir, webpFile)),
  });
}

const textFiles = await listTextFiles();
let changedTextFiles = 0;

for (const textFile of textFiles) {
  const original = await readFile(textFile, "utf8");
  let next = original;

  for (const replacement of replacements) {
    next = replaceAll(next, replacement.fromSitePath, replacement.toSitePath);
    next = replaceAll(next, replacement.fromSourcePath, replacement.toSourcePath);
    next = replaceAll(next, replacement.fromRelativePath, replacement.toRelativePath);
  }

  if (next !== original) {
    await writeFile(textFile, next, "utf8");
    changedTextFiles += 1;
  }
}

for (const pngFile of pngFiles) {
  await rm(pngFile);
}

const savedBytes = totalOriginalBytes - totalWebpBytes;
console.log(`Converted ${pngFiles.length} PNG files to WebP.`);
console.log(`Updated ${changedTextFiles} text files with new image paths.`);
console.log(`Original size: ${(totalOriginalBytes / (1024 * 1024)).toFixed(2)} MB`);
console.log(`WebP size: ${(totalWebpBytes / (1024 * 1024)).toFixed(2)} MB`);
console.log(`Saved: ${(savedBytes / (1024 * 1024)).toFixed(2)} MB`);
