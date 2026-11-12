import { unstable_cache } from 'next/cache';
import { getSourceById, getMediaSourceById } from './sources';
import { fetchSourceContent, fetchMediaContent } from './content';

export const getCachedSourceContent = unstable_cache(
  async (id: string, page: number, limit: number, search: string = '') => {
    const source = getSourceById(id);
    if (!source) {
      throw new Error(`News source with id '${id}' not found.`);
    }
    return fetchSourceContent(source, { page, limit, search: search || undefined });
  },
  ['source-content'],
  {
    revalidate: 300,
    tags: ['news', 'content'],
  }
);

export const getCachedMediaContent = unstable_cache(
  async (id: string, page: number, limit: number, search: string = '') => {
    const source = getMediaSourceById(id);
    if (!source) {
      throw new Error(`Image source with id '${id}' not found.`);
    }
    return fetchMediaContent(source, { page, limit, search: search || undefined });
  },
  ['media-content'],
  {
    revalidate: 300,
    tags: ['news', 'content'],
  }
);
