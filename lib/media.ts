import fs from 'fs';
import path from 'path';
import { Source, SourcesData, isValidId, generateValidId } from './sources';

export function getMediaSourcesData(): SourcesData {
  try {
    const filePath = path.join(process.cwd(), 'data', 'media.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent) as SourcesData;
    
    let modified = false;
    data.sources.forEach(source => {
      if (!isValidId(source.id)) {
        source.id = generateValidId(source.url);
        modified = true;
      } else if (typeof source.id === 'string') {
        source.id = parseInt(source.id, 10);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    }
    return data;
  } catch (error) {
    console.error('Error reading media.json', error);
    return { sources: [] };
  }
}

export function getAllMediaSources(): Source[] {
  return getMediaSourcesData().sources;
}

export function getMediaSourceById(id: string | number): Source | undefined {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  return getAllMediaSources().find((s) => s.id === numericId);
}
