'use client';

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, Clock, Mail } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getUserDetailsForCard } from '@/actions/user';
import { getOrCreateDirectMessage } from '@/actions/channel';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface UserHoverCardProps {
  userId: string;
  workspaceId: string; // Needed to fetch role
  children: React.ReactNode;
}

export function UserHoverCard({
  userId,
  workspaceId,
  children,
}: UserHoverCardProps) {
  const router = useRouter();

  const { data: user, isLoading } = useQuery({
    queryKey: ['user-card', userId, workspaceId],
    queryFn: async () => {
      return await getUserDetailsForCard(userId, workspaceId);
    },
    staleTime: 1000 * 60 * 5, // 5 mins
  });

  const handleMessage = async () => {
    const result = await getOrCreateDirectMessage(workspaceId, userId);
    if (result.error) {
      toast.error(result.error);
    } else if (result.channelId) {
      router.push(`/${workspaceId}/${result.channelId}`);
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
    <HoverCard openDelay={300}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80 p-0 overflow-hidden" align="start">
        {isLoading ? (
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-full bg-muted animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-3 w-16 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
        ) : user ? (
          <div className="flex flex-col">
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
                     <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full dark:bg-green-900/20 dark:text-green-400">
                       <span className="size-1.5 rounded-full bg-green-500" />
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
            User details not found
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
