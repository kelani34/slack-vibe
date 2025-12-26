'use client';

import {
  getScheduledMessages,
  cancelScheduledMessage,
} from '@/actions/message';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ScheduledMessagesProps {
  channelId: string;
  parentId?: string; // For thread-specific scheduled messages
}

export function ScheduledMessages({
  channelId,
  parentId,
}: ScheduledMessagesProps) {
  const queryClient = useQueryClient();
  const queryKey = parentId
    ? ['scheduled-messages', channelId, parentId]
    : ['scheduled-messages', channelId];

  const { data: messages, isLoading } = useQuery({
    queryKey,
    queryFn: () => getScheduledMessages(channelId, parentId),
    refetchInterval: 10000,
  });

  async function handleCancel(messageId: string) {
    const result = await cancelScheduledMessage(messageId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Scheduled message cancelled');
      queryClient.invalidateQueries({ queryKey });
    }
  }

  const count = messages?.length || 0;

  // Don't show icon if no scheduled messages
  if (count === 0) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 relative"
          title={`${count} scheduled message${count > 1 ? 's' : ''}`}
        >
          <Clock className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-[10px] font-medium text-white flex items-center justify-center">
            {count}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Scheduled Messages
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3 pr-4">
            {messages?.map((message) => (
              <div
                key={message.id}
                className="flex gap-3 p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      {format(
                        new Date((message as any).scheduledAt),
                        'MMM d, h:mm a'
                      )}
                    </span>
                  </div>
                  <div
                    className="text-sm prose prose-sm dark:prose-invert max-w-none [&>p]:my-0 line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: message.content }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleCancel(message.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
