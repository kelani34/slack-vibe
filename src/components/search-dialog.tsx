'use client';

import * as React from 'react';
import {
  CreditCard,
  User,
  Hash,
} from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { searchMessages } from '@/actions/message';
import { getWorkspaceChannels } from '@/actions/channel';
import { getWorkspaceMembers } from '@/actions/workspace';
import { useDebounce } from '@/hooks/use-debounce';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type SearchMessagePage = Awaited<ReturnType<typeof searchMessages>>;
type SearchMessage = SearchMessagePage['items'][number];
type SearchMember = Awaited<ReturnType<typeof getWorkspaceMembers>>[number];
type SearchChannel = Awaited<ReturnType<typeof getWorkspaceChannels>>[number];
type SearchFilter = { type: string; value: string; label: string };

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceSlug: string;
}

export function SearchDialog({ open, onOpenChange, workspaceSlug }: SearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchMessage[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [resultsSearchKey, setResultsSearchKey] = React.useState('');
  const [members, setMembers] = React.useState<SearchMember[]>([]);
  const [channels, setChannels] = React.useState<SearchChannel[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [appliedFilters, setAppliedFilters] = React.useState<SearchFilter[]>([]);
  const [activeFilter, setActiveFilter] = React.useState<{ type: 'from' | 'in' | 'none', value: string }>({ type: 'none', value: '' });
  const searchKeyRef = React.useRef('');
  const paginationRequestId = React.useRef(0);
  const isLoadingMoreRef = React.useRef(false);

  React.useEffect(() => {
    if (!open) {
        setQuery('');
        setResults([]);
        setNextCursor(null);
        setResultsSearchKey('');
        setSearchError(null);
        setAppliedFilters([]);
        setIsLoadingMore(false);
        isLoadingMoreRef.current = false;
        paginationRequestId.current += 1;
      }
  }, [open]);

  // Load only the suggestion data required by the active filter.
  React.useEffect(() => {
    if (!open || activeFilter.type === 'none') return;

    let isCurrentRequest = true;
    const loadSuggestions = async () => {
      try {
        if (activeFilter.type === 'from') {
          setMembers([]);
          const fetchedMembers = await getWorkspaceMembers(workspaceSlug);
          if (isCurrentRequest) setMembers(fetchedMembers);
          return;
        }

        setChannels([]);
        const fetchedChannels = await getWorkspaceChannels(workspaceSlug);
        if (isCurrentRequest) setChannels(fetchedChannels);
      } catch (error) {
        if (isCurrentRequest) console.error(error);
      }
    };
    void loadSuggestions();

    return () => {
      isCurrentRequest = false;
    };
  }, [open, workspaceSlug, activeFilter.type]);


  // Debounce query
  const debouncedQuery = useDebounce(query, 300);
  const filterStrings = appliedFilters.map(f => `${f.type}:"${f.value}"`);
  const textQuery = activeFilter.type === 'none' ? debouncedQuery : '';
  const fullQuery = [...filterStrings, textQuery].join(' ').trim();
  const currentSearchKey = `${workspaceSlug}\u0000${fullQuery}`;
  searchKeyRef.current = currentSearchKey;

  // Parse query to detect filter context & auto-tokenize
  React.useEffect(() => {
     // 1. Check if we have a complete filter token ending with space
     // Regex: (start or space)(key):("value"|value)(space)
     const tokenMatch = query.match(/(?:^|\s)(from|in|has|is):(?:"([^"]+)"|(\S+))\s$/);
     if (tokenMatch) {
         const type = tokenMatch[1];
         const value = tokenMatch[2] || tokenMatch[3];
         const label = value; // Use value as label for auto-typed filters
         
         // Insert filter and remove from query
         setAppliedFilters(prev => [...prev, { type, value, label }]);
         setQuery(prev => prev.replace(tokenMatch[0], '').trimStart()); // Remove the token
         return;
     }

     // 2. Check if we are typing a filter (partial)
     const fromMatch = query.match(/from:\s*(\S*)$/);
     if (fromMatch) {
         setActiveFilter({ type: 'from', value: fromMatch[1] });
         return;
     }

     const inMatch = query.match(/in:\s*(\S*)$/);
     if (inMatch) {
        setActiveFilter({ type: 'in', value: inMatch[1] });
        return;
     }

     setActiveFilter({ type: 'none', value: '' });
  }, [query]);

  React.useEffect(() => {
    let isCurrentSearch = true;
    const search = async () => {
      const requestId = ++paginationRequestId.current;
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);

      if (!open || fullQuery.length === 0) {
        setResults([]);
        setNextCursor(null);
        setResultsSearchKey('');
        setSearchError(null);
        setIsSearching(false);
        return;
      }
      
      // Don't search if we are just completing a filter AND we don't have other filters
      // Actually, if we have applied filters, we SHOULD search even if current input is empty
      if (activeFilter.type !== 'none' && appliedFilters.length === 0) {
        setResults([]);
        setNextCursor(null);
        setResultsSearchKey('');
        setIsSearching(false);
        return;
      }

      setNextCursor(null);
      setSearchError(null);
      setIsSearching(true);
      try {
        const page = await searchMessages(fullQuery, workspaceSlug);
        if (isCurrentSearch && paginationRequestId.current === requestId) {
          setResults(page.error ? [] : page.items);
          setNextCursor(page.error ? null : page.nextCursor);
          setResultsSearchKey(currentSearchKey);
          setSearchError(page.error ?? null);
        }
      } catch (error) {
        if (isCurrentSearch) console.error(error);
      } finally {
        if (isCurrentSearch && paginationRequestId.current === requestId) setIsSearching(false);
      }
    };
    search();
    return () => {
      isCurrentSearch = false;
    };
  }, [open, currentSearchKey, fullQuery, workspaceSlug, activeFilter.type, appliedFilters]);

  const loadMore = async () => {
    if (
      !open ||
      !nextCursor ||
      resultsSearchKey !== currentSearchKey ||
      isLoadingMoreRef.current
    ) return;

    const requestQuery = fullQuery;
    const requestKey = currentSearchKey;
    const requestCursor = nextCursor;
    const requestId = ++paginationRequestId.current;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const page = await searchMessages(requestQuery, workspaceSlug, requestCursor);
      if (searchKeyRef.current !== requestKey || paginationRequestId.current !== requestId) return;

      if (page.error) {
        setSearchError(page.error);
        setNextCursor(null);
        return;
      }

      setResults((current) => {
        const knownIds = new Set(current.map((message) => message.id));
        return [...current, ...page.items.filter((message) => !knownIds.has(message.id))];
      });
      setNextCursor(page.nextCursor);
    } catch (error) {
      if (searchKeyRef.current === requestKey) console.error(error);
    } finally {
      if (paginationRequestId.current === requestId) {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
  };

  const handleSelectResult = (messageId: string, channelId: string, parentId: string | null) => {
    onOpenChange(false);
    const params = new URLSearchParams({ message: messageId });
    if (parentId) params.set('thread', parentId);
    router.push(`/${workspaceSlug}/${channelId}?${params.toString()}`, { scroll: false });
  };

  const insertFilter = (type: string, value: string, label: string) => {
      // Add to applied filters
      setAppliedFilters(prev => [...prev, { type, value, label }]);
      
      // Clear the trigger text from query
      // If we typed "from:kev", we remove "from:kev"
      setQuery(prev => {
          if (type === 'from') return prev.replace(/from:\s*\S*$/, '');
          if (type === 'in') return prev.replace(/in:\s*\S*$/, '');
          return prev;
      });
  };

  const removeFilter = (index: number) => {
      setAppliedFilters(prev => prev.filter((_, i) => i !== index));
  };

  const canShowSearchResults = resultsSearchKey.startsWith(`${workspaceSlug}\u0000`);
  const isShowingPreviousResults = resultsSearchKey !== currentSearchKey;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} shouldFilter={false}>
      <CommandInput 
        placeholder={appliedFilters.length > 0 ? "" : "Search messages..."}
        value={query}
        onValueChange={setQuery}
        className={appliedFilters.length > 0 ? "min-w-[100px]" : ""}
      >
        {appliedFilters.map((filter, i) => (
             <span key={i} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-sm whitespace-nowrap">
                <span className="text-muted-foreground">{filter.type}:</span>
                <span className="font-medium">{filter.label}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeFilter(i); }}
                  className="ml-1 hover:bg-background rounded-full p-0.5"
                >
                    <span className="sr-only">Remove</span>
                    <div className="h-3 w-3 text-muted-foreground">x</div>
                </button>
             </span>
        ))}
      </CommandInput>
      <CommandList>
        {searchError && (
          <p role="alert" className="px-3 py-2 text-sm text-destructive">
            {searchError}
          </p>
        )}
        {isSearching && (
          <p role="status" aria-live="polite" className="px-3 py-2 text-xs text-muted-foreground">
            {canShowSearchResults && results.length > 0 && isShowingPreviousResults
              ? 'Searching… Showing previous results.'
              : 'Searching…'}
          </p>
        )}
        <CommandEmpty>
           {searchError ? '' : isSearching ? 'Searching...' : 'No results found.'}
        </CommandEmpty>
        
        {/* Dynamic Suggestions for Filters */}
        {activeFilter.type === 'from' && (
            <CommandGroup heading="Suggesting Users">
                <CommandItem onSelect={() => insertFilter('from', 'me', 'Me')}>
                    <User className="h-4 w-4 mr-2" />
                    <span>Messages from me</span>
                </CommandItem>
                {members
                  .filter(m => (m.name || m.displayName || '').toLowerCase().includes(activeFilter.value.toLowerCase()))
                  .map((member) => {
                    const displayName = member.displayName || member.name || 'Unknown member';
                    return (
                    <CommandItem key={member.id} onSelect={() => insertFilter('from', displayName, displayName)}>
                        <Avatar className="h-6 w-6 mr-2">
                           <AvatarImage src={member.avatarUrl || member.image || undefined} />
                           <AvatarFallback>{displayName[0]}</AvatarFallback>
                        </Avatar>
                        <span>{displayName}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{member.email}</span>
                    </CommandItem>
                  );
                })}
            </CommandGroup>
        )}

        {activeFilter.type === 'in' && (
            <CommandGroup heading="Suggesting Channels">
                {channels
                  .filter(c => c.name.toLowerCase().includes(activeFilter.value.toLowerCase()))
                  .map(channel => (
                    <CommandItem key={channel.id} onSelect={() => insertFilter('in', channel.name, channel.name)}>
                        <Hash className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{channel.name}</span>
                    </CommandItem>
                ))}
            </CommandGroup>
        )}
        
        {/* Main Search Results */}
        {activeFilter.type === 'none' && canShowSearchResults && results.length > 0 && (
          <CommandGroup heading="Messages">
            {results.map((msg) => (
              <CommandItem 
                key={msg.id} 
                onSelect={() => handleSelectResult(msg.id, msg.channelId, msg.parentId)}
                className="flex flex-col items-start gap-1 py-3"
              >
                <div className="flex items-center gap-2 w-full">
                  <div className="flex items-center gap-2 flex-1">
                     {msg.channel && (
                        <span className="flex items-center text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                           <Hash className="h-3 w-3 mr-0.5" />
                           {msg.channel.name} 
                        </span>
                     )}
                     <span className="text-xs font-semibold">{msg.user?.name}</span>
                     <span className="text-[10px] text-muted-foreground ml-auto">
                        {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                     </span>
                  </div>
                </div>
                <p className="text-sm line-clamp-2 text-muted-foreground w-full">
                   {msg.content.replace(/<[^>]*>?/gm, '')}
                </p>
              </CommandItem>
            ))}
            {nextCursor && resultsSearchKey === currentSearchKey && (
              <CommandItem onSelect={() => void loadMore()} disabled={isLoadingMore}>
                {isLoadingMore ? 'Loading more results...' : 'Load more results'}
              </CommandItem>
            )}
          </CommandGroup>
        )}

        {/* Default Suggestions */}
        {query.trim().length === 0 && appliedFilters.length === 0 && (
           <CommandGroup heading="Suggestions">
             <CommandItem onSelect={() => setQuery('from:')}>
               <User className="mr-2 h-4 w-4" />
               <span>From user...</span>
             </CommandItem>
             <CommandItem onSelect={() => setQuery('in:')}>
               <Hash className="mr-2 h-4 w-4" />
               <span>In channel...</span>
             </CommandItem>
             <CommandItem onSelect={() => insertFilter('has', 'image', 'Has image')}>
               <CreditCard className="mr-2 h-4 w-4" /> 
               <span>Has image</span>
             </CommandItem>
             <CommandItem onSelect={() => insertFilter('is', 'pinned', 'Pinned messages')}>
               <CreditCard className="mr-2 h-4 w-4" /> 
               <span>Pinned messages</span>
             </CommandItem>
           </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
