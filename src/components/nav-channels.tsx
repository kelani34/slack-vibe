'use client';

import { Hash, Lock, MoreHorizontal, Trash2, Star, Plus } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { deleteChannel } from '@/actions/channel';
import { CreateChannelDialog } from '@/components/create-channel-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import type { Channel } from '@prisma/client';
import { toast } from 'sonner';

interface NavChannelsProps {
  channels: (Channel & { unreadCount?: number })[];
  workspaceSlug: string;
  workspaceId: string;
  sectionLabel?: string;
  showCreateButton?: boolean;
}

export function NavChannels({
  channels,
  workspaceSlug,
  workspaceId,
  sectionLabel = 'Channels',
  showCreateButton = true,
}: NavChannelsProps) {
  const { isMobile } = useSidebar();
  const params = useParams();
  const currentChannelId = params?.channelId as string;

  async function handleDelete(channelId: string) {
    const result = await deleteChannel(channelId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Channel deleted');
    }
  }

  // Don't render empty Starred section
  if (sectionLabel === 'Starred' && channels.length === 0) {
    return null;
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>
        {sectionLabel === 'Starred' && (
          <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
        )}
        {sectionLabel}
      </SidebarGroupLabel>
      {showCreateButton && (
        <CreateChannelDialog workspaceId={workspaceId}>
          <SidebarGroupAction title="Create Channel">
            <Plus className="h-4 w-4" />
            <span className="sr-only">Create Channel</span>
          </SidebarGroupAction>
        </CreateChannelDialog>
      )}
      <SidebarMenu>
        {channels?.map((channel) => (
          <SidebarMenuItem key={channel.id}>
            <SidebarMenuButton
              asChild
              isActive={channel.id === currentChannelId}
            >
              <Link href={`/${workspaceSlug}/${channel.id}`}>
                {channel.type === 'PRIVATE' ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <Hash className="h-4 w-4" />
                )}
                <span
                  className={
                    channel.unreadCount
                      ? 'font-bold text-foreground'
                      : 'text-muted-foreground'
                  }
                >
                  {channel.name}
                </span>
                {channel.unreadCount ? (
                  <span className="ml-auto text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                    {channel.unreadCount}
                  </span>
                ) : null}
              </Link>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover>
                  <MoreHorizontal />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-48 rounded-lg"
                side={isMobile ? 'bottom' : 'right'}
                align={isMobile ? 'end' : 'start'}
              >
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => handleDelete(channel.id)}
                >
                  <Trash2 className="text-destructive" />
                  <span>Delete Channel</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
        {showCreateButton && channels?.length === 0 && (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            No channels yet. Create one!
          </p>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
