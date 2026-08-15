import { execSync } from 'node:child_process';
const head = execSync('git show HEAD:source/marathon-lore/content/modules/store.json', { encoding: 'utf8' });
const d = JSON.parse(head);
console.log('HEAD bundles count:', (d.bundles || []).length);
console.log(JSON.stringify(d.bundles, null, 2));
