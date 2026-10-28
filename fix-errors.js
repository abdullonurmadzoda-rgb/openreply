const fs = require('fs');
const path = 'd:\\CAD_Install\\мои программы\\н8н\\openreply\\lib\\queue\\dm-worker.ts';
let content = fs.readFileSync(path, 'utf8');

// Fix revealMediaErrors2 / msgMediaErrors - replace line by line
const lines = content.split('\n');
const newLines = [];
let skipNext = 0;

for (let i = 0; i < lines.length; i++) {
  if (skipNext > 0) {
    skipNext--;
    continue;
  }
  
  const line = lines[i];
  
  // Replace the revealMediaErrors2 line
  if (line.includes('const revealMediaErrors2 = sendFollowPrompt ? []')) {
    newLines.push('      const revealMediaErrorsFinal = revealMediaErrors2 ?? [];');
    continue;
  }
  
  // Replace the msgMediaErrMsg lines (2 lines)
  if (line.includes('const msgMediaErrMsg = msgMediaErrors.length > 0')) {
    newLines.push('      const msgMediaErrMsg = revealMediaErrorsFinal.length > 0');
    newLines.push('        ? `DM text sent, but media failed: ${revealMediaErrorsFinal.join("; ")}`');
    newLines.push('        : null;');
    skipNext = 2;
    continue;
  }
  
  newLines.push(line);
}

content = newLines.join('\n');
fs.writeFileSync(path, content);
console.log('Done');