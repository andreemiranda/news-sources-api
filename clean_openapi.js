const fs = require('fs');

function cleanFile(file) {
  let text = fs.readFileSync(file, 'utf8');
  
  const removeBlock = (path) => {
    const search = `      '${path}': {\n`;
    const startIdx = text.indexOf(search);
    if (startIdx === -1) return;
    
    let braceCount = 0;
    let inBlock = false;
    let endIdx = -1;
    
    for (let i = startIdx + search.indexOf('{'); i < text.length; i++) {
      if (text[i] === '{') {
        braceCount++;
        inBlock = true;
      } else if (text[i] === '}') {
        braceCount--;
      }
      
      if (inBlock && braceCount === 0) {
        // Next character is probably a comma, let's include it
        if (text[i+1] === ',') i++;
        if (text[i+1] === '\n') i++;
        endIdx = i;
        break;
      }
    }
    
    if (endIdx !== -1) {
      text = text.substring(0, startIdx) + text.substring(endIdx + 1);
    }
  };
  
  removeBlock('/sources/{id}');
  removeBlock('/sources/category/{category}');
  removeBlock('/media/{id}');
  
  fs.writeFileSync(file, text);
}

cleanFile('app/page.tsx');
cleanFile('app/api/openapi.json/route.ts');
