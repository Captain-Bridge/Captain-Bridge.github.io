import fs from 'node:fs';

const root = 'source/marathon-lore';
const storePath = `${root}/content/modules/store.json`;
const d = JSON.parse(fs.readFileSync(storePath, 'utf8'));
const items = d.items || [];
const bundles = d.bundles || [];
const itemIds = new Set(items.map(i => i.id));

console.log('items count:', items.length);
console.log('bundles count:', bundles.length);
console.log('--- bundles ---');
for (const b of bundles) {
  const missing = (b.itemIds || []).filter(id => !itemIds.has(id));
  console.log(JSON.stringify({ id: b.id, title: b.title, featured: b.featured, itemIds: (b.itemIds || []).length, missing }));
}
console.log('--- member id lookup ---');
for (const id of ['Crush_the_coffin_v75','Crush_the_coffin_HBR','Crush_the_coffin_M77','Crush_the_coffin_overrun','igniter','Crush_the_coffin_bundle_ZR30','Crush_the_coffin_bundle_3000_bullets']) {
  const it = items.find(i => i.id === id);
  console.log(id, '=>', it ? ('FOUND title=' + it.title) : 'MISSING');
}
console.log('--- duplicate item ids ---');
const seen = new Map();
for (const i of items) {
  if (seen.has(i.id)) console.log('DUP id:', i.id);
  seen.set(i.id, (seen.get(i.id) || 0) + 1);
}
console.log('--- bundle cover/md existence ---');
const paths = [
  `${root}/content/docs/store/bundles/Crush_the_coffin_bundle/Crush_the_coffin_bundle_cover.webp`,
  `${root}/content/docs/store/bundles/Crush_the_coffin_bundle/Crush_the_coffin_bundle.md`,
  `${root}/content/docs/store/bundles/yokai_weapon_bundle/yokai_weapon_bundle_cover.webp`,
  `${root}/content/docs/store/bundles/yokai_weapon_bundle/yokai_weapon_bundle.md`,
];
for (const p of paths) {
  if (fs.existsSync(p)) console.log('OK  ', p, fs.statSync(p).size, 'bytes');
  else console.log('MISS', p);
}
const fire = `${root}/content/docs/store/bundles/fire_car_yokai_bundle`;
console.log('--- fire_car_yokai_bundle dir ---');
if (fs.existsSync(fire)) console.log(fs.readdirSync(fire));
else console.log('dir missing');
