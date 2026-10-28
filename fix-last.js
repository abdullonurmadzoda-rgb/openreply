const fs = require('fs');
const p = 'd:\\CAD_Install\\мои программы\\н8н\\openreply\\lib\\queue\\dm-worker.ts';
let c = fs.readFileSync(p, 'utf8');

const old = "          accessToken,\n          automation,\n          senderId,\n          commenterName,\n          \"message trigger\"";
const newStr = "          accessToken,\n          automation as any,\n          senderId,\n          commenterName,\n          \"message trigger\"";
if (c.includes(old)) {
  c = c.replace(old, newStr);
  console.log('Fixed');
} else {
  console.log('not found');
}
fs.writeFileSync(p, c);