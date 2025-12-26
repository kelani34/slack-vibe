import { auth } from '@/auth';
import { ChatPanel } from '@/components/chat-panel';
import { StarButton } from '@/components/star-button';
import { ChannelDetailsDialog } from '@/components/channel/channel-details-dialog';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import { Hash, Lock } from 'lucide-react';

interface PageProps {
  params: Promise<{
    workspaceSlug: string;
    channelId: string;
  }>;
}

export default async function ChannelPage({ params }: PageProps) {
  const { workspaceSlug, channelId } = await params;
  const session = await auth();

  if (!session?.user) redirect('/login');

  // Lookup channel with member count, check if starred, and get user role
  const [channel, starred, memberCount, member, channelMember] =
    await Promise.all([
      prisma.channel.findUnique({
        where: { id: channelId },
        include: {
          workspace: true,
        },
      }),
      prisma.starredChannel.findUnique({
        where: {
          userId_channelId: {
            userId: session.user.id!,
            channelId,
          },
        },
      }),
      prisma.channelMember.count({
        where: { channelId },
      }),
      prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: await prisma.workspace
              .findUnique({ where: { slug: workspaceSlug } })
              .then((w) => w?.id || ''),
            userId: session.user.id!,
          },
        },
      }),
      prisma.channelMember.findUnique({
        where: {
          channelId_userId: {
            channelId,
            userId: session.user.id!,
          },
        },
      }),
    ]);

  if (!channel || channel.workspace.slug !== workspaceSlug) {
    return notFound();
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex h-12 items-center justify-between border-b px-4 shrink-0">
        <div className="flex items-center gap-2">
          <StarButton channelId={channel.id} initialStarred={!!starred} />
          <ChannelDetailsDialog
            channel={channel}
            currentUserId={session.user.id!}
            workspaceId={channel.workspaceId}
            userRole={member?.role || 'MEMBER'}
          >
            <button className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md transition-colors">
              {channel.type === 'PRIVATE' ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Hash className="h-4 w-4 text-muted-foreground" />
              )}
              <h1 className="font-semibold">{channel.name}</h1>
            </button>
          </ChannelDetailsDialog>
        </div>
      </header>
      <ChatPanel
        channelId={channel.id}
        workspaceId={channel.workspaceId}
        workspaceSlug={workspaceSlug}
        userId={session.user.id!}
        userRole={member?.role}
        currentUser={{
          id: session.user.id!,
          name: session.user.name || 'User',
          image: session.user.image,
        }}
        isArchived={channel.isArchived}
        channelCreatorId={channel.creatorId}
        channelPostingPermission={channel.postingPermission}
        isChannelMember={!!channelMember}
        lastReadAt={channelMember?.lastViewedAt}
      />
    </div>
  );
}
