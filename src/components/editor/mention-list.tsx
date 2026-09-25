import React, {
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface MentionListItem {
  id: string;
  name: string;
  avatarUrl?: string | null;
  image?: string | null;
}

export interface MentionListProps {
  items: MentionListItem[];
  command: (props: { id: string; label: string }) => void;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  (props, ref) => {
    const { items, command } = props;
    const [selection, setSelection] = useState({ items, index: 0 });
    const selectedIndex = selection.items === items ? selection.index : 0;

    const setSelectedIndex = (index: number) => {
      setSelection({ items, index });
    };

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command({ id: item.id, label: item.name });
      }
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          if (items.length > 0) {
            const offset = event.key === 'ArrowUp' ? -1 : 1;
            setSelection({
              items,
              index: (selectedIndex + offset + items.length) % items.length,
            });
          }
          return true;
        }

        if (event.key === 'Enter') {
          const item = items[selectedIndex];
          if (item) command({ id: item.id, label: item.name });
          return true;
        }

        return false;
      },
    }), [command, items, selectedIndex]);

    if (items.length === 0) {
      return null;
    }

    return (
      <div className="z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
        <div className="max-h-[200px] overflow-y-auto">
          {items.map((item, index) => (
            <button
              key={item.id}
              className={cn(
                'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors gap-2',
                index === selectedIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted'
              )}
              onClick={() => selectItem(index)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={item.avatarUrl || item.image || ''} />
                <AvatarFallback>{item.name?.[0] || '?'}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="font-medium text-xs truncate max-w-[150px]">
                  {item.name}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }
);

MentionList.displayName = 'MentionList';
