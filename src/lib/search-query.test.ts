import { describe, expect, it } from 'vitest';

import { parseSearchQuery } from './search-query';

describe('parseSearchQuery', () => {
  it('extracts supported filters and leaves the message text', () => {
    const result = parseSearchQuery(
      'weekly sync from:"Alex Doe" in:team has:file is:pinned after:2026-09-24 before:2026-09-25',
    );

    expect(result).toEqual({
      filters: {
        text: 'weekly sync',
        fromUser: 'Alex Doe',
        inChannel: 'team',
        has: 'file',
        pinnedOnly: true,
        createdAt: {
          gte: new Date('2026-09-24T00:00:00.000Z'),
          lte: new Date('2026-09-25T23:59:59.999Z'),
        },
      },
    });
  });

  it.each([
    ['after:not-a-date', 'after: must use YYYY-MM-DD or an ISO timestamp with a timezone.'],
    ['has:audio', 'Use has:image, has:file, or has:video.'],
    ['is:archived', 'Use is:pinned as the supported status filter.'],
    ['in:', 'Complete each search filter with a value before searching.'],
    ['after:""', 'Add a value after after: before searching.'],
    ['', 'Enter text or a search filter.'],
    ['x'.repeat(501), 'Search must be 500 characters or fewer.'],
    ['in:general in:random', 'Use the in: filter only once per search.'],
    ['after:2026-09-26 before:2026-09-24', 'The after: date must be on or before the before: date.'],
  ])('rejects invalid query %s', (query, error) => {
    expect(parseSearchQuery(query)).toEqual({ error });
  });
});
