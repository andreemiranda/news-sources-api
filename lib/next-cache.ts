import { unstable_cache } from 'next/cache';
import { getSourceById, getMediaSourceById } from './sources';
import { fetchSourceContent, fetchMediaContent } from './content';

export const getCachedSourceContent = unstable_cache(
  async (id: string, page: number, limit: number, search: string = '', baseDomain?: string) => {
    const baseSource = getSourceById(id);
    if (!baseSource) {
      throw new Error(`News source with id '${id}' not found.`);
    }
    const source =
      baseDomain && (!baseSource.site || baseSource.site === 'localhost')
        ? { ...baseSource, site: baseDomain }
        : baseSource;
    return fetchSourceContent(source, { page, limit, search: search || undefined });
  },
  ['source-content'],
  {
    revalidate: 300,
    tags: ['news', 'content'],
  }
);

export const getCachedMediaContent = unstable_cache(
  async (id: string, page: number, limit: number, search: string = '', baseDomain?: string) => {
    const baseSource = getMediaSourceById(id);
    if (!baseSource) {
      throw new Error(`Image source with id '${id}' not found.`);
    }
    const source =
      baseDomain && (!baseSource.site || baseSource.site === 'localhost')
        ? { ...baseSource, site: baseDomain }
        : baseSource;
    return fetchMediaContent(source, { page, limit, search: search || undefined });
  },
  ['media-content'],
  {
    revalidate: 300,
    tags: ['news', 'content'],
  }
);
