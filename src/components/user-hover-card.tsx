'use client';

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Clock, Mail } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getUserDetailsForCard } from '@/actions/user';
import { getOrCreateDirectMessage } from '@/actions/channel';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface UserHoverCardProps {
  userId: string;
  viewerId?: string;
  workspaceId: string; // Needed to fetch role
  workspaceSlug?: string;
  children: React.ReactNode;
}

export function UserHoverCard({
  userId,
  viewerId,
  workspaceId,
  workspaceSlug,
  children,
}: UserHoverCardProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const { data: user, isLoading, isError, refetch } = useQuery({
    queryKey: ['user-card', userId, workspaceId, viewerId ?? null],
    queryFn: async () => {
      return await getUserDetailsForCard(userId, workspaceId);
    },
    staleTime: 1000 * 60 * 5, // 5 mins
    enabled: isOpen && !!viewerId,
  });

  const handleMessage = async () => {
    const result = await getOrCreateDirectMessage(workspaceId, userId);
    if (result.error) {
      toast.error(result.error);
    } else if (result.channelId) {
      router.push(`/${workspaceSlug || workspaceId}/${result.channelId}`);
      router.refresh();
    }
  };

  // Calculate local time for user if timezone is present
  const localTime = user?.timezone
    ? new Date().toLocaleTimeString('en-US', {
        timeZone: user.timezone,
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <HoverCard open={isOpen} onOpenChange={setIsOpen} openDelay={300}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80 p-0 overflow-hidden" align="start">
        {isLoading ? (
          <div role="status" aria-label="Loading member details" className="p-4 flex flex-col gap-3">
            <div aria-hidden="true" className="flex items-center gap-3">
              <Skeleton className="size-12 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        ) : isError && !user ? (
          <div role="alert" className="flex flex-col items-start gap-3 p-4">
            <p className="text-sm text-muted-foreground">Couldn’t load member details.</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : user ? (
          <div className="flex flex-col">
            {isError && (
              <div role="alert" className="flex items-center justify-between gap-3 px-4 pt-3 text-sm text-muted-foreground">
                <span>Couldn’t refresh member details.</span>
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                  Try again
                </Button>
              </div>
            )}
             {/* Header with gradient or color */}
             <div className="h-16 bg-gradient-to-r from-blue-500 to-indigo-500 relative">
             </div>
             
             <div className="px-4 pb-4 -mt-8">
               <div className="flex justify-between items-end">
                  <Avatar className="size-16 border-4 border-background shadow-sm">
                    <AvatarImage src={user.avatarUrl || ''} />
                    <AvatarFallback className="text-xl">{user.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="mb-1">
                    <Button size="sm" onClick={handleMessage}>
                      <MessageSquare className="size-4 mr-2" />
                      Message
                    </Button>
                  </div>
               </div>

               <div className="mt-3">
                 <h3 className="font-bold text-lg leading-none">{user.name}</h3>
                 {user.displayName && (
                   <p className="text-sm text-muted-foreground">{user.displayName}</p>
                 )}
                 
                 <div className="flex items-center gap-2 mt-2">
                   <div className="px-2 py-0.5 bg-muted rounded text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                     {user.role}
                   </div>
                   {user.status === 'ONLINE' && (
                     <span className="flex items-center gap-1.5 text-xs text-success font-medium bg-success-surface px-2 py-0.5 rounded-full">
                       <span className="size-1.5 rounded-full bg-success" />
                       Online
                     </span>
                   )}
                 </div>

                 <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                   {user.email && (
                     <div className="flex items-center gap-2">
                       <Mail className="size-4 opacity-70" />
                       <a href={`mailto:${user.email}`} className="hover:underline hover:text-foreground">
                         {user.email}
                       </a>
                     </div>
                   )}
                   {localTime && (
                     <div className="flex items-center gap-2">
                       <Clock className="size-4 opacity-70" />
                       <span>{localTime} local time</span>
                     </div>
                   )}
                 </div>
               </div>
             </div>
          </div>
        ) : (
          <div className="p-4 text-sm text-muted-foreground">
            Member details are unavailable.
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
