'use client';

import { getWorkspaceChannels } from '@/actions/channel';
import { forwardMessage } from '@/actions/message-actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

interface ForwardMessageDialogProps {
  messageId: string | null;
  actorId: string;
  workspaceSlug: string;
  onOpenChange: (open: boolean) => void;
}

export function ForwardMessageDialog({
  messageId,
  actorId,
  workspaceSlug,
  onOpenChange,
}: ForwardMessageDialogProps) {
  const open = messageId !== null;
  const [targetChannelId, setTargetChannelId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { data: channels = [] } = useQuery({
    queryKey: ['member-channel-options', actorId, workspaceSlug],
    queryFn: () => getWorkspaceChannels(workspaceSlug),
    enabled: open,
  });

  async function handleSubmit() {
    if (!messageId || !targetChannelId) return;
    setIsSending(true);
    const result = await forwardMessage(messageId, targetChannelId);
    setIsSending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Message forwarded');
    onOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setTargetChannelId('');
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Forward message</DialogTitle>
          <DialogDescription>Select a channel you belong to.</DialogDescription>
        </DialogHeader>
        <Select value={targetChannelId} onValueChange={setTargetChannelId}>
          <SelectTrigger aria-label="Destination channel">
            <SelectValue placeholder="Choose a channel" />
          </SelectTrigger>
          <SelectContent>
            {channels.map((channel) => (
              <SelectItem key={channel.id} value={channel.id}>
                #{channel.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!targetChannelId || isSending}
          >
            {isSending ? 'Forwarding…' : 'Forward message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
