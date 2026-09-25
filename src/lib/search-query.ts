export type SearchQueryFilters = {
  text: string;
  fromUser?: string;
  inChannel?: string;
  has?: 'image' | 'file' | 'video';
  pinnedOnly?: true;
  createdAt?: { gte?: Date; lte?: Date };
};

export type SearchQueryParseResult =
  | { filters: SearchQueryFilters }
  | { error: string };

const filterToken = /(^|\s)(from|in|has|is|after|before):\s*(?:"([^"]*)"|([^\s"]+))/gi;
const filterPrefix = /(?:^|\s)(?:from|in|has|is|after|before):/i;

function parseDate(value: string, bound: 'after' | 'before'): Date | null {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  if (!dateOnly && !timestamp) return null;

  const calendarDay = value.slice(0, 10);
  const startOfDay = new Date(`${calendarDay}T00:00:00.000Z`);
  if (Number.isNaN(startOfDay.getTime()) || startOfDay.toISOString().slice(0, 10) !== calendarDay) {
    return null;
  }

  if (dateOnly) {
    return bound === 'before'
      ? new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1)
      : startOfDay;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseSearchQuery(query: unknown): SearchQueryParseResult {
  if (typeof query !== 'string') return { error: 'Search query must be text.' };
  if (query.length > 500) return { error: 'Search must be 500 characters or fewer.' };

  const tokens = [...query.matchAll(filterToken)];
  const text = query.replace(filterToken, ' ').replace(/\s+/g, ' ').trim();
  if (filterPrefix.test(text)) {
    return { error: 'Complete each search filter with a value before searching.' };
  }

  const seen = new Set<string>();
  const filters: SearchQueryFilters = { text };
  for (const token of tokens) {
    const [, , rawKey, quotedValue, plainValue] = token;
    const key = rawKey.toLowerCase();
    const value = (quotedValue ?? plainValue ?? '').trim();
    if (!value) return { error: `Add a value after ${key}: before searching.` };
    if (seen.has(key)) return { error: `Use the ${key}: filter only once per search.` };
    seen.add(key);

    if (key === 'from') {
      filters.fromUser = value;
    } else if (key === 'in') {
      filters.inChannel = value;
    } else if (key === 'has') {
      if (value !== 'image' && value !== 'file' && value !== 'video') {
        return { error: 'Use has:image, has:file, or has:video.' };
      }
      filters.has = value;
    } else if (key === 'is') {
      if (value !== 'pinned') return { error: 'Use is:pinned as the supported status filter.' };
      filters.pinnedOnly = true;
    } else if (key === 'after' || key === 'before') {
      const date = parseDate(value, key);
      if (!date) {
        return { error: `${key}: must use YYYY-MM-DD or an ISO timestamp with a timezone.` };
      }
      filters.createdAt ??= {};
      if (key === 'after') filters.createdAt.gte = date;
      else filters.createdAt.lte = date;
    }
  }

  if (
    filters.createdAt?.gte &&
    filters.createdAt.lte &&
    filters.createdAt.gte > filters.createdAt.lte
  ) {
    return { error: 'The after: date must be on or before the before: date.' };
  }
  if (!text && seen.size === 0) return { error: 'Enter text or a search filter.' };

  return { filters };
}
