import mediaData from '@/data/media.json';
import { Source, SourcesData } from './sources';

export function getMediaSourcesData(): SourcesData {
  return mediaData as SourcesData;
}

export function getAllMediaSources(): Source[] {
  return getMediaSourcesData().sources;
}

export function getMediaSourceById(id: string): Source | undefined {
  return getAllMediaSources().find((s) => s.id === id);
}
