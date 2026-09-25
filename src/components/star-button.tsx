'use client';

import { toggleStarChannel } from '@/actions/star';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';
import { toast } from 'sonner';

interface StarButtonProps {
  channelId: string;
  initialStarred: boolean;
}

export function StarButton({ channelId, initialStarred }: StarButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticStarred, setOptimisticStarred] =
    useOptimistic(initialStarred);

  async function handleToggle() {
    startTransition(async () => {
      setOptimisticStarred(!optimisticStarred);

      const result = await toggleStarChannel(channelId);

      if (result.error) {
        toast.error(result.error);
        setOptimisticStarred(optimisticStarred); // Revert
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={handleToggle}
      disabled={isPending}
      title={optimisticStarred ? 'Unstar channel' : 'Star channel'}
    >
      <Star
        className={`h-4 w-4 ${
          optimisticStarred
            ? 'fill-favorite text-favorite'
            : 'text-muted-foreground'
        }`}
      />
    </Button>
  );
}
