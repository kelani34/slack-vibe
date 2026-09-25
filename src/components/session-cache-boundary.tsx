'use client';

import { useLayoutEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

export function SessionCacheBoundary() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const previousActorId = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (status === 'loading') return;

    const actorId = status === 'authenticated' ? session?.user?.id ?? null : null;
    if (previousActorId.current && previousActorId.current !== actorId) {
      queryClient.clear();
    }
    previousActorId.current = actorId;
  }, [queryClient, session, status]);

  return null;
}
