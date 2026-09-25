import { auth } from '@/auth';
import { ChatPanel } from '@/components/chat-panel';
import { DirectMessageActions } from '@/components/direct-message-actions';
import { ChannelAccessDenied } from '@/components/channel/channel-access-denied';
import { getWorkspaceMembers } from '@/actions/workspace';
import { StarButton } from '@/components/star-button';
import { ChannelDetailsDialog } from '@/components/channel/channel-details-dialog';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Hash, Lock } from 'lucide-react';
import { DirectMessageAvatars } from '@/components/direct-message-avatars';

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

  // Lookup channel, star state, workspace role, and current channel membership
  const [channel, starred, member, channelMember] =
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
  if (!channelMember) {
    return (
      <div className="flex h-full flex-1 overflow-hidden">
        <ChannelAccessDenied />
      </div>
    );
  }

  const isDirect = channel.type === 'DIRECT' || channel.name.startsWith('dm-');
  const isGroup = channel.type === 'DIRECT' && channel.directKey === null;
  const currentUserId = session.user.id!;
  const directMembers = isDirect
    ? await prisma.channelMember.findMany({
        where: { channelId: channel.id },
        orderBy: [{ joinedAt: 'asc' }, { userId: 'asc' }],
        select: {
          user: {
            select: { id: true, name: true, displayName: true, avatarUrl: true, image: true },
          },
        },
      })
    : [];
  const directParticipants = directMembers.filter(({ user }) => user.id !== currentUserId);
  const groupAvatarMembers = [
    ...directParticipants,
    ...directMembers.filter(({ user }) => user.id === currentUserId),
  ];
  const avatarParticipants = isGroup
    ? groupAvatarMembers.map(({ user }) => user)
    : directParticipants.map(({ user }) => user);
  const directParticipant = directParticipants[0];
  const participantNames = directParticipants
    .map(({ user }) => user.displayName || user.name || 'Workspace member')
    .join(', ');
  const directName =
    isGroup
      ? channel.name.startsWith('dm-group-')
        ? participantNames || 'Group conversation'
        : channel.name
      : directParticipant?.user.displayName || directParticipant?.user.name || 'Direct message';
  const workspaceMembers = isGroup ? await getWorkspaceMembers(workspaceSlug) : [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex h-12 items-center justify-between border-b px-4 shrink-0">
        <div className="flex items-center gap-2">
          {!isDirect && <StarButton channelId={channel.id} initialStarred={!!starred} />}
          {isDirect ? (
            <div className="flex min-w-0 items-center gap-2 px-2 py-1">
              <Link
                href={`/${workspaceSlug}/dms`}
                className="-ml-2 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
                aria-label="Back to direct messages"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <DirectMessageAvatars
                participants={avatarParticipants}
                isGroup={isGroup}
                fallbackName={directName}
                size="header"
              />
              <h1 className="truncate font-semibold">{directName}</h1>
            </div>
          ) : (
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
          )}
        </div>
        {isGroup && (
          <DirectMessageActions
            channelId={channel.id}
            workspaceId={channel.workspaceId}
            workspaceSlug={workspaceSlug}
            currentUserId={session.user.id!}
            initialName={directName}
            members={workspaceMembers}
            participantIds={directParticipants.map(({ user }) => user.id)}
          />
        )}
      </header>
      <ChatPanel
        channelId={channel.id}
        workspaceId={channel.workspaceId}
        messagePlaceholder={isDirect ? `Message ${directName}...` : undefined}
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
