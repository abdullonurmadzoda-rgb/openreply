const fs = require('fs');
const path = 'd:\\CAD_Install\\мои программы\\н8н\\openreply\\lib\\queue\\dm-worker.ts';
let content = fs.readFileSync(path, 'utf8');

// Fix: Add null check for instagramAccount in processComment for loop
const old1 = 'for (const automation of automations) {\n    // "Any word" campaigns fire on every comment; otherwise require a keyword hit.';
const new1 = 'for (const automation of automations) {\n    // Comment and message processing require an Instagram account.\n    if (!automation.instagramAccount) continue;\n\n    // "Any word" campaigns fire on every comment; otherwise require a keyword hit.';
if (content.includes(old1)) {
  content = content.replace(old1, new1);
  console.log('Fixed processComment for loop');
} else {
  console.log('Pattern 1 not found');
}

// Fix: processMessage for loop - add null check
const old2 = 'for (const automation of automations) {\n    const matchResult = automation.matchAnyWord';
const new2 = 'for (const automation of automations) {\n    // Message processing requires an Instagram account.\n    if (!automation.instagramAccount) continue;\n\n    const matchResult = automation.matchAnyWord';
if (content.includes(old2)) {
  content = content.replace(old2, new2);
  console.log('Fixed processMessage for loop');
} else {
  console.log('Pattern 2 not found');
}

// Fix: recordWorkerFailure - instagramAccountId may not exist on TikTok jobs
const old3 = '    const instagramAccountId = job?.data.instagramAccountId;';
const new3 = '    const instagramAccountId = "instagramAccountId" in (job?.data ?? {}) ? (job?.data as any).instagramAccountId : null;';
if (content.includes(old3)) {
  content = content.replace(old3, new3);
  console.log('Fixed recordWorkerFailure');
} else {
  console.log('Pattern 3 not found');
}

fs.writeFileSync(path, content);
console.log('Done');