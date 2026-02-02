'use client';

import * as React from 'react';
import { 
  Calculator, 
  Calendar, 
  CreditCard, 
  Settings, 
  Smile, 
  User,
  Search,
  MessageSquare,
  Hash
} from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { searchMessages } from '@/actions/message';
import { getChannels, getWorkspaceChannels } from '@/actions/channel';
import { getWorkspaceMembers, getWorkspaces } from '@/actions/workspace';
import { useDebounce } from '@/hooks/use-debounce';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceSlug: string;
}

export function SearchDialog({ open, onOpenChange, workspaceSlug }: SearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<any[]>([]);
  const [members, setMembers] = React.useState<any[]>([]);
  const [channels, setChannels] = React.useState<any[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [appliedFilters, setAppliedFilters] = React.useState<{ type: string; value: string; label: string }[]>([]);
  const [activeFilter, setActiveFilter] = React.useState<{ type: 'from' | 'in' | 'none', value: string }>({ type: 'none', value: '' });

  React.useEffect(() => {
    if (!open) {
        setQuery('');
        setResults([]);
        setAppliedFilters([]);
    }
  }, [open]);

  // Load context data on open
  React.useEffect(() => {
    if (open) {
      const loadContext = async () => {
        try {
           const [fetchedMembers, fetchedChannels] = await Promise.all([
             getWorkspaceMembers(workspaceSlug),
             getWorkspaceChannels(workspaceSlug)
           ]);
           setMembers(fetchedMembers);
           setChannels(fetchedChannels);
        } catch (e) {
           console.error(e);
        }
      };
      loadContext();
    }
  }, [open, workspaceSlug]);


  // Debounce query
  const debouncedQuery = useDebounce(query, 300);

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
    const search = async () => {
      // Construct full query from filters + current input
      const filterStrings = appliedFilters.map(f => `${f.type}:"${f.value}"`);
      // We only include debouncedQuery if it's NOT a partial filter
      const textQuery = activeFilter.type === 'none' ? debouncedQuery : '';
      const fullQuery = [...filterStrings, textQuery].join(' ').trim();

      if (fullQuery.length === 0) {
        setResults([]);
        return;
      }
      
      // Don't search if we are just completing a filter AND we don't have other filters
      // Actually, if we have applied filters, we SHOULD search even if current input is empty
      if (activeFilter.type !== 'none' && appliedFilters.length === 0) return;

      setIsSearching(true);
      try {
        const data = await searchMessages(fullQuery, workspaceSlug);
        setResults(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsSearching(false);
      }
    };
    search();
  }, [debouncedQuery, workspaceSlug, activeFilter.type, appliedFilters]);

  const handleSelectResult = (messageId: string, channelId: string) => {
    onOpenChange(false);
    router.push(`/${workspaceSlug}/${channelId}?message=${messageId}`);
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
        <CommandEmpty>
           {isSearching ? 'Searching...' : 'No results found.'}
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
                  .map(member => (
                    <CommandItem key={member.id} onSelect={() => insertFilter('from', member.name, member.name)}>
                        <Avatar className="h-6 w-6 mr-2">
                           <AvatarImage src={member.avatarUrl || member.image} />
                           <AvatarFallback>{(member.name || '?')[0]}</AvatarFallback>
                        </Avatar>
                        <span>{member.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{member.email}</span>
                    </CommandItem>
                ))}
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
        {activeFilter.type === 'none' && results.length > 0 && (
          <CommandGroup heading="Messages">
            {results.map((msg) => (
              <CommandItem 
                key={msg.id} 
                onSelect={() => handleSelectResult(msg.id, msg.channelId)}
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
