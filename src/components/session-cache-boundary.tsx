'use client';

import { useLayoutEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function SessionCacheBoundary() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const previousActorId = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (status === 'loading') return;

    const actorId = status === 'authenticated' ? session?.user?.id ?? null : null;
    if (previousActorId.current && actorId === null) {
      queryClient.clear();
      const callbackUrl = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?${new URLSearchParams({ callbackUrl })}`);
    } else if (previousActorId.current && previousActorId.current !== actorId) {
      queryClient.clear();
      router.refresh();
    }
    previousActorId.current = actorId;
  }, [queryClient, router, session, status]);

  return null;
}
