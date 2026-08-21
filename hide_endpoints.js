const fs = require('fs');
function hideEndpoints(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  // This is a bit hacky, but we can do a regex replace to remove the keys
  
  // Actually, wait, it's easier to just parse it or do simple replacements
  // Let's use AST or just write a small parser.
}
