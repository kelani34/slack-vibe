'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { markChannelAsRead } from '@/actions/channel-member';
import { Button } from '@/components/ui/button';

export function MarkUnreadConversationRead({
  channelId,
  label,
}: {
  channelId: string;
  label: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function markRead() {
    startTransition(async () => {
      const result = await markChannelAsRead(channelId);
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      aria-label={label}
      disabled={isPending}
      onClick={markRead}
    >
      {isPending ? 'Marking…' : 'Mark read'}
    </Button>
  );
}
