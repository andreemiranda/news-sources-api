
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSourcesByCategory, getBaseUrl } from '@/lib/sources';
import { validateApiKey, unauthorizedResponse, paginate } from '@/lib/auth';
import { toCleanSource } from '@/lib/hateoas';
import { getCachedSourceContent, deduplicateFeedImages, ContentItem } from '@/lib/content';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  const { category } = await params;
  const decodedCategory = decodeURIComponent(category);
  const sources = getSourcesByCategory(decodedCategory);

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limitParam = url.searchParams.get('limit') || url.searchParams.get('per_page') || '100';
  const limit = parseInt(limitParam, 10);
  const isFeed = url.searchParams.get('feed') === 'true' || url.searchParams.get('articles') === 'true';

  const baseUrl = getBaseUrl(req);

  // Se o usuário solicitou o feed agregado de artigos da categoria
  if (isFeed) {
    const activeSources = sources.filter((s) => s.active);
    const articlesLimit = Math.min(30, Math.max(1, limit || 20));

    // Buscar matérias das fontes da categoria
    const categoryArticles: ContentItem[] = [];
    for (const src of activeSources.slice(0, 5)) {
      try {
        const res = await getCachedSourceContent(String(src.id), 1, 10, '');
        if (res && Array.isArray(res.items)) {
          categoryArticles.push(...res.items);
        }
      } catch {
        // continua para próxima fonte da categoria
      }
    }

    // Deduplica imagens no feed da categoria: em caso de repetição de URL, seleciona segunda imagem da matéria e incorpora
    const dedupedCategoryArticles = deduplicateFeedImages(categoryArticles);
    const paginatedArticles = paginate(dedupedCategoryArticles, page, articlesLimit);

    return NextResponse.json(paginatedArticles.items, {
      headers: {
        'X-WP-Total': paginatedArticles.meta.total.toString(),
        'X-WP-TotalPages': paginatedArticles.meta.totalPages.toString(),
      },
    });
  }

  const mappedSources = sources.map((s) => toCleanSource(s, baseUrl, true));
  const result = paginate(mappedSources, page, limit);

  return NextResponse.json(result.items, {
    headers: {
      'X-WP-Total': result.meta.total.toString(),
      'X-WP-TotalPages': result.meta.totalPages.toString(),
    },
  });
}
