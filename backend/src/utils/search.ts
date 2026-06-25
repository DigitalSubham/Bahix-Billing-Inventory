type SearchInput = unknown;

export const getSearchTerm = (value: SearchInput): string | undefined => {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (typeof normalized !== "string") {
    return undefined;
  }

  const trimmed = normalized.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};
