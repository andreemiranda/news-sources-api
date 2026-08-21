const fs = require('fs');

function updateFile(file) {
  let text = fs.readFileSync(file, 'utf8');
  
  // Replace /sources with /news
  text = text.replace(/'\/sources': \{/g, `'/news': {`);
  text = text.replace(/'\/sources\/\{id\}\/content': \{/g, `'/news/{id}': {`);
  
  // Replace /media with /images
  text = text.replace(/'\/media': \{/g, `'/images': {`);
  text = text.replace(/'\/media\/\{id\}\/content': \{/g, `'/images/{id}': {`);
  
  // We want to remove the '/sources/{id}' and '/sources/category/{category}' and '/media/{id}' blocks entirely.
  // We can do this manually next if we want, or use AST. Let's just do it manually with regex.
  // Actually, replacing their keys with something like '/backend/sources/{id}' makes them exist but shows they are internal.
  // Or we just remove them from the spec by parsing string or simple regex.
  
  fs.writeFileSync(file, text);
}

updateFile('app/page.tsx');
updateFile('app/api/openapi.json/route.ts');
