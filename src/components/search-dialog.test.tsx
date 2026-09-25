import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import type { searchMessages } from '@/actions/message';
import { SearchDialog } from './search-dialog';

const fixture = vi.hoisted(() => ({
  searchMessages: vi.fn(),
  getWorkspaceChannels: vi.fn().mockResolvedValue([]),
  getWorkspaceMembers: vi.fn().mockResolvedValue([]),
  push: vi.fn(),
}));

vi.mock('@/actions/message', () => ({ searchMessages: fixture.searchMessages }));
vi.mock('@/actions/channel', () => ({ getWorkspaceChannels: fixture.getWorkspaceChannels }));
vi.mock('@/actions/workspace', () => ({ getWorkspaceMembers: fixture.getWorkspaceMembers }));
vi.mock('@/hooks/use-debounce', () => ({ useDebounce: (value: string) => value }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: fixture.push }) }));
vi.mock('@/components/ui/command', () => ({
  CommandDialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null,
  CommandEmpty: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  CommandGroup: ({ heading, children }: { heading: string; children: ReactNode }) => (
    <section>
      <h2>{heading}</h2>
      {children}
    </section>
  ),
  CommandInput: ({
    value,
    onValueChange,
    placeholder,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    children?: ReactNode;
  }) => (
    <div>
      <input
        aria-label="Search messages"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onValueChange(event.currentTarget.value)}
      />
      {children}
    </div>
  ),
  CommandItem: ({ children, onSelect }: { children: ReactNode; onSelect?: () => void }) => (
    <button onClick={onSelect}>{children}</button>
  ),
  CommandList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

type SearchPage = Awaited<ReturnType<typeof searchMessages>>;
type SearchResult = SearchPage['items'][number];

function page(items: SearchResult[], nextCursor: string | null = null, error?: string): SearchPage {
  return { items, nextCursor, error } as SearchPage;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

function result(id: string, content: string, parentId: string | null = null): SearchResult {
  return {
    id,
    channelId: 'channel-1',
    parentId,
    content,
    createdAt: new Date('2026-09-24T12:00:00Z'),
    user: { name: 'Alex' },
    channel: { name: 'general' },
  } as unknown as SearchResult;
}

beforeEach(() => vi.clearAllMocks());

it('keeps the newest query results when an earlier search resolves late', async () => {
  const earlierSearch = deferred<SearchPage>();
  const latestSearch = deferred<SearchPage>();
  fixture.searchMessages
    .mockReturnValueOnce(earlierSearch.promise)
    .mockReturnValueOnce(latestSearch.promise);

  render(<SearchDialog open onOpenChange={vi.fn()} workspaceSlug="acme" />);
  const input = screen.getByRole('textbox', { name: 'Search messages' });

  fireEvent.change(input, { target: { value: 'older query' } });
  await waitFor(() => expect(fixture.searchMessages).toHaveBeenCalledWith('older query', 'acme'));
  fireEvent.change(input, { target: { value: 'latest query' } });
  await waitFor(() => expect(fixture.searchMessages).toHaveBeenCalledWith('latest query', 'acme'));

  await act(async () => latestSearch.resolve(page([result('latest', 'Latest query result')])));
  expect(screen.getByText('Latest query result')).toBeInTheDocument();

  await act(async () => earlierSearch.resolve(page([result('stale', 'Older query result')])));
  expect(screen.getByText('Latest query result')).toBeInTheDocument();
  expect(screen.queryByText('Older query result')).not.toBeInTheDocument();
});

it('ignores an in-flight search result after the dialog closes', async () => {
  const pendingSearch = deferred<SearchPage>();
  fixture.searchMessages.mockReturnValueOnce(pendingSearch.promise);
  const onOpenChange = vi.fn();
  const { rerender } = render(
    <SearchDialog open onOpenChange={onOpenChange} workspaceSlug="acme" />,
  );

  fireEvent.change(screen.getByRole('textbox', { name: 'Search messages' }), {
    target: { value: 'pending query' },
  });
  await waitFor(() => expect(fixture.searchMessages).toHaveBeenCalledWith('pending query', 'acme'));

  rerender(<SearchDialog open={false} onOpenChange={onOpenChange} workspaceSlug="acme" />);
  await act(async () => pendingSearch.resolve(page([result('stale', 'Closed dialog result')])));

  rerender(<SearchDialog open onOpenChange={onOpenChange} workspaceSlug="acme" />);
  expect(screen.queryByText('Closed dialog result')).not.toBeInTheDocument();
});

it('does not load member or channel suggestions for a plain text search', async () => {
  fixture.searchMessages.mockResolvedValue(page([]));
  render(<SearchDialog open onOpenChange={vi.fn()} workspaceSlug="acme" />);

  fireEvent.change(screen.getByRole('textbox', { name: 'Search messages' }), {
    target: { value: 'release notes' },
  });
  await waitFor(() => expect(fixture.searchMessages).toHaveBeenCalledWith('release notes', 'acme'));

  expect(fixture.getWorkspaceMembers).not.toHaveBeenCalled();
  expect(fixture.getWorkspaceChannels).not.toHaveBeenCalled();
});

it('appends the next search page without replacing the current results', async () => {
  fixture.searchMessages
    .mockResolvedValueOnce(page([result('first', 'First page result')], 'next-page-cursor'))
    .mockResolvedValueOnce(page([result('second', 'Second page result')]));
  render(<SearchDialog open onOpenChange={vi.fn()} workspaceSlug="acme" />);

  fireEvent.change(screen.getByRole('textbox', { name: 'Search messages' }), {
    target: { value: 'release notes' },
  });
  await waitFor(() => expect(screen.getByText('First page result')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Load more results' }));

  await waitFor(() => expect(fixture.searchMessages).toHaveBeenLastCalledWith(
    'release notes',
    'acme',
    'next-page-cursor',
  ));
  expect(screen.getByText('First page result')).toBeInTheDocument();
  expect(screen.getByText('Second page result')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Load more results' })).not.toBeInTheDocument();
});

it('ignores a pending next page after the user changes the search query', async () => {
  const pendingPage = deferred<SearchPage>();
  fixture.searchMessages
    .mockResolvedValueOnce(page([result('first', 'First query result')], 'next-page-cursor'))
    .mockReturnValueOnce(pendingPage.promise)
    .mockResolvedValueOnce(page([result('current', 'Current query result')]));
  render(<SearchDialog open onOpenChange={vi.fn()} workspaceSlug="acme" />);
  const input = screen.getByRole('textbox', { name: 'Search messages' });

  fireEvent.change(input, { target: { value: 'first query' } });
  await waitFor(() => expect(screen.getByText('First query result')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Load more results' }));
  await waitFor(() => expect(fixture.searchMessages).toHaveBeenLastCalledWith(
    'first query',
    'acme',
    'next-page-cursor',
  ));

  fireEvent.change(input, { target: { value: 'current query' } });
  await waitFor(() => expect(screen.getByText('Current query result')).toBeInTheDocument());
  await act(async () => pendingPage.resolve(page([result('stale', 'Stale next page result')])));

  expect(screen.getByText('Current query result')).toBeInTheDocument();
  expect(screen.queryByText('Stale next page result')).not.toBeInTheDocument();
});

it('keeps the last useful results visible with progress feedback during a new search', async () => {
  const nextSearch = deferred<SearchPage>();
  fixture.searchMessages
    .mockResolvedValueOnce(page([result('first', 'Previous query result')]))
    .mockReturnValueOnce(nextSearch.promise);
  render(<SearchDialog open onOpenChange={vi.fn()} workspaceSlug="acme" />);
  const input = screen.getByRole('textbox', { name: 'Search messages' });

  fireEvent.change(input, { target: { value: 'previous query' } });
  await waitFor(() => expect(screen.getByText('Previous query result')).toBeInTheDocument());
  fireEvent.change(input, { target: { value: 'new query' } });

  await waitFor(() => expect(fixture.searchMessages).toHaveBeenLastCalledWith('new query', 'acme'));
  expect(screen.getByText('Previous query result')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Showing previous results');

  await act(async () => nextSearch.resolve(page([result('new', 'New query result')])));
  expect(screen.queryByText('Previous query result')).not.toBeInTheDocument();
  expect(screen.getByText('New query result')).toBeInTheDocument();
});

it('shows filter validation errors instead of rendering a misleading empty result state', async () => {
  fixture.searchMessages.mockResolvedValue(page([], null, 'Use a supported search filter.'));
  render(<SearchDialog open onOpenChange={vi.fn()} workspaceSlug="acme" />);

  fireEvent.change(screen.getByRole('textbox', { name: 'Search messages' }), {
    target: { value: 'has:audio' },
  });

  expect(await screen.findByRole('alert')).toHaveTextContent('Use a supported search filter.');
  expect(screen.queryByText('No results found.')).not.toBeInTheDocument();
});

it('loads only the matching suggestion list while completing a search filter', async () => {
  render(<SearchDialog open onOpenChange={vi.fn()} workspaceSlug="acme" />);

  fireEvent.change(screen.getByRole('textbox', { name: 'Search messages' }), {
    target: { value: 'from:alex' },
  });
  await waitFor(() => expect(fixture.getWorkspaceMembers).toHaveBeenCalledWith('acme'));

  expect(fixture.getWorkspaceChannels).not.toHaveBeenCalled();
});

it('loads channel suggestions only for the in filter', async () => {
  render(<SearchDialog open onOpenChange={vi.fn()} workspaceSlug="acme" />);

  fireEvent.change(screen.getByRole('textbox', { name: 'Search messages' }), {
    target: { value: 'in:general' },
  });
  await waitFor(() => expect(fixture.getWorkspaceChannels).toHaveBeenCalledWith('acme'));

  expect(fixture.getWorkspaceMembers).not.toHaveBeenCalled();
});

it('opens search results for replies in their parent thread context', async () => {
  fixture.searchMessages.mockResolvedValue(page([
    result('reply-result', 'Reply search result', 'root-message'),
  ]));
  render(<SearchDialog open onOpenChange={vi.fn()} workspaceSlug="acme" />);

  fireEvent.change(screen.getByRole('textbox', { name: 'Search messages' }), {
    target: { value: 'reply search' },
  });
  fireEvent.click(await screen.findByText('Reply search result'));

  expect(fixture.push).toHaveBeenCalledWith(
    '/acme/channel-1?message=reply-result&thread=root-message',
    { scroll: false },
  );
});
