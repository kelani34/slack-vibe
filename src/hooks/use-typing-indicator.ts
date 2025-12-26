import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

const TYPING_TIMEOUT = 3000;

interface TypingUser {
  id: string;
  name: string;
  avatarUrl?: string;
  lastTyped: number;
}

export function useTypingIndicator(
  channelId: string,
  currentUser?: { id: string; name: string; avatarUrl?: string }
) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastBroadcastRef = useRef<number>(0);

  useEffect(() => {
    if (!channelId) return;

    const channel = supabase.channel(`typing:${channelId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        const user = payload.payload;
        if (user.id === currentUser?.id) return;

        setTypingUsers((prev) => {
          const existing = prev.find((u) => u.id === user.id);
          const now = Date.now();

          if (existing) {
            return prev.map((u) =>
              u.id === user.id ? { ...u, lastTyped: now } : u
            );
          }
          return [...prev, { ...user, lastTyped: now }];
        });
      })
      .subscribe();

    // Cleanup interval to remove stale typing users
    const interval = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        return prev.filter((u) => now - u.lastTyped < TYPING_TIMEOUT);
      });
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [channelId, currentUser?.id]);

  const broadcastTyping = useCallback(() => {
    if (!currentUser || !channelRef.current) return;

    // Throttle sending typing events locally
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    } // Just clears the "stop typing" logic if I had it, but here we just want to ensure we don't spam?
    // Actually standard throttle is better: dont send if sent recently.
    // But for simplicity/responsiveness, we can just send. Supabase handles some rate limit.
    // Let's implement a small throttle (e.g. 500ms).
    // Or cleaner: Reset a timer. If timer exists, don't send? No, we want to send periodically to keep "alive".

    // Simple approach: Send. The receiver handles expiration.
    // Optimization: Only send once every 1s.

    // Let's rely on a simple throttle using a ref timestamp
    const now = Date.now();
    if (now - lastBroadcastRef.current < 1000) return;
    lastBroadcastRef.current = now;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        id: currentUser.id,
        name: currentUser.name,
        avatarUrl: currentUser.avatarUrl,
      },
    });
  }, [currentUser]);

  return { typingUsers, broadcastTyping };
}
