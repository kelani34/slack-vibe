'use client';

import {
  getScheduledMessages,
  cancelScheduledMessage,
  sendScheduledMessageNow,
  updateScheduledMessage,
} from '@/actions/message';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Clock, Pencil, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import parse from 'html-react-parser';
import { messageHtmlToText, sanitizeMessageHtml } from '@/lib/message-html';

interface ScheduledMessagesProps {
  channelId: string;
  workspaceId: string;
  actorId?: string;
  parentId?: string; // For thread-specific scheduled messages
}

export function CancelScheduledMessageButton({ messageId }: { messageId: string }) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);

  async function handleCancel() {
    setIsCancelling(true);
    const result = await cancelScheduledMessage(messageId);
    setIsCancelling(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Scheduled message cancelled');
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-destructive hover:text-destructive"
      onClick={handleCancel}
      disabled={isCancelling}
      aria-label="Cancel scheduled message"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

export function ScheduledMessageActions({
  messageId,
  initialContent,
  initialScheduledAt,
}: {
  messageId: string;
  initialContent: string;
  initialScheduledAt: Date;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(messageHtmlToText(initialContent));
  const [date, setDate] = useState(format(initialScheduledAt, 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(initialScheduledAt, 'HH:mm'));
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    const scheduledAt = new Date(`${date}T${time}`);
    if (Number.isNaN(scheduledAt.getTime())) {
      toast.error('Choose a valid date and time');
      return;
    }
    setIsSaving(true);
    const result = await updateScheduledMessage(messageId, content, scheduledAt);
    setIsSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Scheduled message updated');
    setOpen(false);
    router.refresh();
  }

  async function handleSendNow() {
    setIsSaving(true);
    const result = await sendScheduledMessageNow(messageId);
    setIsSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Message sent');
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit scheduled message">
            <Pencil className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit scheduled message</DialogTitle>
            <DialogDescription>Update the message and its future delivery time.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea value={content} onChange={(event) => setContent(event.target.value)} aria-label="Message content" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Schedule date" />
              <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} aria-label="Schedule time" />
            </div>
            <Button onClick={handleSave} disabled={isSaving || !content.trim()}>Save changes</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSendNow} disabled={isSaving} aria-label="Send scheduled message now">
        <Send className="h-4 w-4" />
      </Button>
      <CancelScheduledMessageButton messageId={messageId} />
    </div>
  );
}

export function ScheduledMessages({
  channelId,
  workspaceId,
  actorId,
  parentId,
}: ScheduledMessagesProps) {
  const queryClient = useQueryClient();
  const queryKey = [
    'scheduled-messages',
    actorId ?? null,
    workspaceId,
    channelId,
    parentId ?? null,
  ];

  const { data: messages } = useQuery({
    queryKey,
    queryFn: () => getScheduledMessages(channelId, workspaceId, parentId),
    enabled: !!actorId,
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
          aria-label={`${count} scheduled message${count > 1 ? 's' : ''}`}
          title={`${count} scheduled message${count > 1 ? 's' : ''}`}
        >
          <Clock className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-warning text-[10px] font-medium text-warning-foreground flex items-center justify-center">
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
                    <span className="text-xs font-medium text-warning">
                      {format(
                        new Date(message.scheduledAt!),
                        'MMM d, h:mm a'
                      )}
                    </span>
                  </div>
                  <div className="text-sm prose prose-sm dark:prose-invert max-w-none [&>p]:my-0 line-clamp-2">
                    {parse(sanitizeMessageHtml(message.content))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleCancel(message.id)}
                  aria-label="Cancel scheduled message"
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
