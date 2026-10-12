import { Source } from './sources';

export interface IPaginationMeta {
  itemCount: number;
  totalItems: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface IPaginationLinks {
  first: string;
  previous: string;
  next: string;
  last: string;
}

export interface IHateoasLink {
  href: string | null;
  templated?: boolean;
  type?: string;
}

export interface IHateoasLinks {
  self: IHateoasLink;
  first?: IHateoasLink;
  prev?: IHateoasLink;
  next?: IHateoasLink;
  last?: IHateoasLink;
  [key: string]: IHateoasLink | undefined;
}

export interface PaginatedHateoasResponse<T> {
  items: T[];
  _embedded: {
    items: T[];
  };
  meta: IPaginationMeta;
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
  links: IPaginationLinks;
  _links: IHateoasLinks;
}

export interface CleanSourceDto {
  id: number;
  category: string;
  type: string;
  active: boolean;
  _links: {
    self: IHateoasLink;
    news: IHateoasLink;
    images: IHateoasLink;
  };
}

export function toCleanSource(source: Source, baseUrl: string): CleanSourceDto {
  const numericId = typeof source.id === 'number' ? source.id : parseInt(String(source.id), 10);

  return {
    id: numericId,
    category: source.category || '',
    type: source.type || 'wp-api',
    active: Boolean(source.active),
    _links: {
      self: { href: `${baseUrl}/api/news/${numericId}` },
      news: { href: `${baseUrl}/api/news/${numericId}` },
      images: { href: `${baseUrl}/api/images/${numericId}` },
    },
  };
}

export function buildPaginationLinks(
  basePath: string,
  page: number,
  limit: number,
  totalPages: number,
  queryParams: Record<string, string | number | boolean | undefined> = {}
): { links: IPaginationLinks; _links: IHateoasLinks } {
  const buildUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    params.set('page', String(targetPage));
    params.set('limit', String(limit));
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && key !== 'page' && key !== 'limit' && key !== 'per_page') {
        params.set(key, String(value));
      }
    }
    return `${basePath}?${params.toString()}`;
  };

  const firstUrl = buildUrl(1);
  const lastUrl = totalPages > 0 ? buildUrl(totalPages) : buildUrl(1);
  const prevUrl = page > 1 ? buildUrl(page - 1) : '';
  const nextUrl = page < totalPages ? buildUrl(page + 1) : '';
  const selfUrl = buildUrl(page);

  const links: IPaginationLinks = {
    first: firstUrl,
    previous: prevUrl,
    next: nextUrl,
    last: lastUrl,
  };

  const _links: IHateoasLinks = {
    self: { href: selfUrl },
    first: { href: firstUrl },
    prev: { href: prevUrl || null },
    next: { href: nextUrl || null },
    last: { href: lastUrl },
  };

  return { links, _links };
}

export function paginateWithHateoas<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
  basePath: string,
  queryParams: Record<string, string | number | boolean | undefined> = {},
  extraLinks: Record<string, IHateoasLink> = {}
): PaginatedHateoasResponse<T> {
  const safePage = Math.max(1, page || 1);
  const safeLimit = Math.max(1, limit || 10);
  const totalPages = Math.ceil(total / safeLimit) || 1;

  const { links, _links } = buildPaginationLinks(
    basePath,
    safePage,
    safeLimit,
    totalPages,
    queryParams
  );

  for (const [key, val] of Object.entries(extraLinks)) {
    _links[key] = val;
  }

  const meta: IPaginationMeta = {
    itemCount: items.length,
    totalItems: total,
    itemsPerPage: safeLimit,
    totalPages,
    currentPage: safePage,
  };

  const pageModel = {
    size: safeLimit,
    totalElements: total,
    totalPages,
    number: safePage,
  };

  return {
    items,
    _embedded: {
      items,
    },
    meta,
    page: pageModel,
    links,
    _links,
  };
}
