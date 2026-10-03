const MAX_PAGE_SIZE = 200;

// Returns null when the caller did not ask for a page, so existing full-list consumers keep working.
export const parsePagination = (req, { defaultSize = 25 } = {}) => {
  const params = new URL(req.url).searchParams;
  if (!params.has('page') && !params.has('pageSize')) return null;

  const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(params.get('pageSize') || String(defaultSize), 10) || defaultSize));
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    search: String(params.get('search') || '').trim(),
    params,
  };
};

export const buildPaginationMeta = (total, { page, pageSize }) => ({
  page,
  pageSize,
  total,
  totalPages: Math.max(1, Math.ceil(total / pageSize)),
});

export const paginateArray = (items, pagination) => ({
  rows: items.slice(pagination.skip, pagination.skip + pagination.take),
  meta: buildPaginationMeta(items.length, pagination),
});

export const containsFilter = (search) => ({ contains: search, mode: 'insensitive' });
