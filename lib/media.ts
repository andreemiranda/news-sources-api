import mediaData from '@/data/media.json';
import { Source, SourcesData } from './sources';

const DATA: SourcesData = mediaData as SourcesData;

export function getMediaSourcesData(): SourcesData {
  return DATA;
}

export function getAllMediaSources(): Source[] {
  return DATA.sources;
}

export function getMediaSourceById(id: string): Source | undefined {
  return DATA.sources.find((s) => s.id === id);
}
