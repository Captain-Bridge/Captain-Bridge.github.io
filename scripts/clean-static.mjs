import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
await fs.rm(path.join(root, 'public'), { recursive: true, force: true });
console.log('Removed public/');
