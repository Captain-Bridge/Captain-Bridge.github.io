import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync('source/marathon-lore/content/modules/store.json', 'utf8'));
console.log('bundles count:', d.bundles.length);
console.log(JSON.stringify(d.bundles, null, 2));
