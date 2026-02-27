type PaginationDefaults = {
  page?: number;
  limit?: number;
};

type QueryLike = {
  page?: unknown;
  limit?: unknown;
  search?: unknown;
};

export const getPagination = (
  query: QueryLike,
  defaults: PaginationDefaults = {},
) => {
  const defaultPage = defaults.page ?? 1;
  const defaultLimit = defaults.limit ?? 10;

  const pageNum = Math.max(1, Number(query.page) || defaultPage);
  const limitNum = Math.max(1, Number(query.limit) || defaultLimit);
  const skip = (pageNum - 1) * limitNum;
  const searchText = typeof query.search === "string" ? query.search.trim() : "";

  return { pageNum, limitNum, skip, searchText };
};

export const applySearchFilter = (
  filter: Record<string, unknown>,
  searchText: string,
  fields: string[],
) => {
  if (!searchText || !fields.length) return filter;

  const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const searchRegex = { $regex: escapedSearch, $options: "i" };
  filter.$or = fields.map((field) => ({ [field]: searchRegex }));

  return filter;
};
