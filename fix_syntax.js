const fs = require('fs');

function fixFile(file) {
  let text = fs.readFileSync(file, 'utf8');
  
  // We need to delete the block that starts with `': {` and ends with `},`
  // The block in page.tsx:
  // ': {
  //   get: {
  //     tags: ['Sources'],
  //     summary: 'Get sources by category',
  // ...
  //   },
  // },
  // 
  // Let's just find `': {` and remove its entire block.
  
  while (text.indexOf("': {\n") !== -1) {
    let startIdx = text.indexOf("': {\n");
    let braceCount = 0;
    let inBlock = false;
    let endIdx = -1;
    
    // go backward to remove leading spaces if any
    let b = startIdx;
    while (b > 0 && text[b-1] === ' ') { b--; }
    startIdx = b;
    
    for (let i = startIdx + text.substring(startIdx).indexOf('{'); i < text.length; i++) {
      if (text[i] === '{') {
        braceCount++;
        inBlock = true;
      } else if (text[i] === '}') {
        braceCount--;
      }
      
      if (inBlock && braceCount === 0) {
        if (text[i+1] === ',') i++;
        if (text[i+1] === '\n') i++;
        endIdx = i;
        break;
      }
    }
    
    if (endIdx !== -1) {
      text = text.substring(0, startIdx) + text.substring(endIdx + 1);
    } else {
      break;
    }
  }
  
  fs.writeFileSync(file, text);
}

fixFile('app/page.tsx');
fixFile('app/api/openapi.json/route.ts');
