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
import { useDebounce } from '@/hooks/use-debounce'; // Assuming generic hook or I create local
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceSlug: string;
}

export function SearchDialog({ open, onOpenChange, workspaceSlug }: SearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<any[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  // Debounce query
  const debouncedQuery = React.useMemo(() => {
    // Simple inline debounce implementation if hook missing
    // But let's assume I'll handle effect
    return query;
  }, [query]);

  React.useEffect(() => {
    const timer = setTimeout(async () => {
      if (debouncedQuery.trim().length === 0) {
        setResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        const data = await searchMessages(debouncedQuery, workspaceSlug);
        setResults(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [debouncedQuery, workspaceSlug]);

  const handleSelect = (messageId: string, channelId: string) => {
    // Navigate to message
    // Ideally open thread or scroll to message
    // For now: navigate to channel ?message=ID (if supported) or just channel
    // Implementation Plan didn't specify exact deep link behavior, assuming channel nav
    onOpenChange(false);
    // TODO: support deep linking to message location
    // For now, assume jumping to channel is good first step, 
    // or if we have message deep linking logic ready:
    window.location.href = `/${workspaceSlug}/channel/${channelId}?message=${messageId}`; 
    // Using window.location to force full reload might be safer for deep link scrolling 
    // if client-side nav doesn't handle scroll-to-message logic yet.
    // Or use router.push if confident.
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Search messages (try 'from:kehlani' or 'in:general')..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
           {isSearching ? 'Searching...' : 'No results found.'}
        </CommandEmpty>
        
        {query.trim().length === 0 && (
           <CommandGroup heading="Suggestions">
             <CommandItem onSelect={() => setQuery('from:me ')}>
               <User className="mr-2 h-4 w-4" />
               <span>Messages from me</span>
             </CommandItem>
             <CommandItem onSelect={() => setQuery('has:attachment ')}>
               <CreditCard className="mr-2 h-4 w-4" /> 
               {/* Icon placeholder, maybe Paperclip if available */}
               <span>Has attachment</span>
             </CommandItem>
           </CommandGroup>
        )}

        {results.length > 0 && (
          <CommandGroup heading="Messages">
            {results.map((msg) => (
              <CommandItem 
                key={msg.id} 
                onSelect={() => handleSelect(msg.id, msg.channelId)}
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
                   {msg.content}
                </p>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
