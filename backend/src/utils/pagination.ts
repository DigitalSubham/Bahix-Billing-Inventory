const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

type PaginationInput = unknown;

const parsePositiveInt = (
  value: PaginationInput,
): number | undefined => {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (
    normalized === undefined ||
    normalized === null ||
    normalized === "" ||
    (typeof normalized !== "string" && typeof normalized !== "number")
  ) {
    return undefined;
  }

  const parsed = Number.parseInt(String(normalized), 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return undefined;
  }

  return parsed;
};

export const getPagination = (
  pageInput: PaginationInput,
  limitInput: PaginationInput,
) => {
  const requestedPage = parsePositiveInt(pageInput);
  const requestedLimit = parsePositiveInt(limitInput);
  const enabled = pageInput !== undefined || limitInput !== undefined;

  const page = requestedPage ?? DEFAULT_PAGE;
  const limit = Math.min(requestedLimit ?? DEFAULT_LIMIT, MAX_LIMIT);

  return {
    enabled,
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

export const buildPaginationMeta = (
  total: number,
  page: number,
  limit: number,
) => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  hasNextPage: page * limit < total,
});
