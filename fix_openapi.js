const fs = require('fs');

function removeKey(obj, keys) {
  if (Array.isArray(obj)) {
    obj.forEach(i => removeKey(i, keys));
  } else if (typeof obj === 'object' && obj !== null) {
    for (let k in obj) {
      if (keys.includes(k)) {
        delete obj[k];
      } else {
        removeKey(obj[k], keys);
      }
    }
  }
}

// But wait, the file is a TS file, not a JSON file.
// We can parse the OpenAPI object if we extract it, but it's part of the TS code.
