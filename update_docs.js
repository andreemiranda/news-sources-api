const fs = require('fs');

function updateDoc(file) {
  let text = fs.readFileSync(file, 'utf8');
  
  text = text.replace(/\/api\/sources/g, '/api/news');
  text = text.replace(/\/api\/media/g, '/api/images');
  text = text.replace(/\/api\/news\/{id}\/content/g, '/api/news/{id}');
  text = text.replace(/\/api\/images\/{id}\/content/g, '/api/images/{id}');
  
  // also /api/news/1/content -> /api/news/1
  text = text.replace(/\/api\/news\/1\/content/g, '/api/news/1');
  text = text.replace(/\/api\/images\/28\/content/g, '/api/images/28');
  
  fs.writeFileSync(file, text);
}

updateDoc('README.md');
updateDoc('API_DOCS.md');
console.log('Docs updated');
