'use client';

import { joinChannel, leaveChannel } from '@/actions/channel-member';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Hash, Lock, Users, Search } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Channel {
  id: string;
  name: string;
  type: string;
  isMember: boolean;
  memberCount: number;
  isArchived: boolean;
}

interface BrowseChannelsListProps {
  channels: Channel[];
  workspaceSlug: string;
}

export function BrowseChannelsList({
  channels,
  workspaceSlug,
}: BrowseChannelsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [channelStates, setChannelStates] = useState<Record<string, boolean>>(
    Object.fromEntries(channels.map((c) => [c.id, c.isMember]))
  );
  const router = useRouter();

  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleJoin(channelId: string) {
    startTransition(async () => {
      const result = await joinChannel(channelId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setChannelStates((prev) => ({ ...prev, [channelId]: true }));
        toast.success('Joined channel');
        router.refresh();
      }
    });
  }

  async function handleLeave(channelId: string) {
    startTransition(async () => {
      const result = await leaveChannel(channelId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setChannelStates((prev) => ({ ...prev, [channelId]: false }));
        toast.success('Left channel');
        router.refresh();
      }
    });
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search channels..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Channel list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredChannels.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No channels found
            </p>
          ) : (
            filteredChannels.map((channel) => {
              const isMember = channelStates[channel.id];

              return (
                <div
                  key={channel.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                >
                  <Link
                    href={`/${workspaceSlug}/${channel.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    {channel.type === 'PRIVATE' ? (
                      <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
                    ) : (
                      <Hash className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{channel.name}</p>
                        {channel.isArchived && (
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded border text-muted-foreground">
                            Archived
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>
                          {channel.memberCount} member
                          {channel.memberCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </Link>

                  {channel.isArchived ? (
                    <Button variant="ghost" size="sm" disabled>
                      Archived
                    </Button>
                  ) : isMember ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="group-hover:bg-destructive group-hover:text-destructive-foreground group-hover:border-destructive transition-colors"
                      onClick={() => handleLeave(channel.id)}
                      disabled={isPending}
                    >
                      <span className="group-hover:hidden">Joined</span>
                      <span className="hidden group-hover:inline">Leave</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleJoin(channel.id)}
                      disabled={isPending}
                    >
                      Join
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
