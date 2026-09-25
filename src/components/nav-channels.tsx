'use client';

import { Hash, Lock, MessageSquarePlus, MoreHorizontal, Trash2, Star, Plus } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { deleteChannel } from '@/actions/channel';
import { CreateChannelDialog } from '@/components/create-channel-dialog';
import { DirectMessageAvatars } from '@/components/direct-message-avatars';
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

export type SidebarChannel = Pick<Channel, 'id' | 'name' | 'type' | 'directKey'> & {
  unreadCount?: number;
  lastViewedAt?: Date;
  directUser?: {
    id: string;
    name: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    image: string | null;
  };
  directUsers?: Array<{
    id: string;
    name: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    image: string | null;
  }>;
  directAvatarUsers?: Array<{
    id: string;
    name: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    image: string | null;
  }>;
};

interface NavChannelsProps {
  channels: SidebarChannel[];
  workspaceSlug: string;
  workspaceId: string;
  sectionLabel?: string;
  sectionHref?: string;
  showCreateButton?: boolean;
  isDirect?: boolean;
}

function getDirectDisplayName(channel: SidebarChannel) {
  const participants = channel.directUsers?.length
    ? channel.directUsers
    : channel.directUser
      ? [channel.directUser]
      : [];
  const isGroup = channel.type === 'DIRECT' && channel.directKey === null;
  if (isGroup) {
    const names = participants.slice(0, 3).map((participant) => participant.displayName || participant.name || 'Member');
    return channel.name.startsWith('dm-group-')
      ? `${names.join(', ')}${participants.length > 3 ? ` +${participants.length - 3}` : ''}`
      : channel.name;
  }
  return participants[0]?.displayName || participants[0]?.name || 'Direct message';
}

export function NavChannels({
  channels,
  workspaceSlug,
  workspaceId,
  sectionLabel = 'Channels',
  sectionHref,
  showCreateButton = true,
  isDirect = false,
}: NavChannelsProps) {
  const { isMobile } = useSidebar();
  const params = useParams();
  const router = useRouter();
  const currentChannelId = params?.channelId as string;

  async function handleDelete(channelId: string) {
    const result = await deleteChannel(channelId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Channel deleted');
      router.refresh();
    }
  }

  // Don't render empty Starred section
  if (sectionLabel === 'Starred' && channels.length === 0) {
    return null;
  }
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel asChild={!!sectionHref}>
        {sectionHref ? (
          <Link href={sectionHref} className="hover:text-sidebar-foreground">
            {sectionLabel}
          </Link>
        ) : (
          <>
            {sectionLabel === 'Starred' && (
              <Star className="mr-1 h-3 w-3 fill-favorite text-favorite" />
            )}
            {sectionLabel}
          </>
        )}
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
        {channels?.map((channel) => {
          const directParticipants = channel.directAvatarUsers?.length
            ? channel.directAvatarUsers
            : channel.directUsers?.length
            ? channel.directUsers
            : channel.directUser
              ? [channel.directUser]
              : [];
          const isGroup = channel.type === 'DIRECT' && channel.directKey === null;
          const directName = getDirectDisplayName(channel);

          return (
            <SidebarMenuItem key={channel.id}>
              <SidebarMenuButton
                asChild
                isActive={channel.id === currentChannelId}
              >
                <Link href={`/${workspaceSlug}/${channel.id}`}>
                  {isDirect ? (
                    <DirectMessageAvatars
                      participants={directParticipants}
                      isGroup={isGroup}
                      fallbackName={directName}
                      size="sidebar"
                    />
                  ) : channel.type === 'PRIVATE' ? (
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
                    {isDirect ? directName : channel.name}
                  </span>
                  {channel.unreadCount ? (
                    <span className="ml-auto text-xs bg-unread text-unread-foreground rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                      {channel.unreadCount}
                    </span>
                  ) : null}
                </Link>
              </SidebarMenuButton>
              {!isDirect && (
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
              )}
            </SidebarMenuItem>
          );
        })}
        {showCreateButton && channels?.length === 0 && (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            No channels yet. Create one!
          </p>
        )}
        {isDirect && channels.length === 0 && sectionHref && (
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href={sectionHref}>
                <MessageSquarePlus className="h-4 w-4" />
                <span>Start a message</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
