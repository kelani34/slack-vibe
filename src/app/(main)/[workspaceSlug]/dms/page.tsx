import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquarePlus } from 'lucide-react';
import { notFound } from 'next/navigation';

import { auth } from '@/auth';
import { getDirectMessageInbox, type DirectMessageInboxItem } from '@/actions/channel';
import { getWorkspaceMembers } from '@/actions/workspace';
import { DirectMessageAvatars } from '@/components/direct-message-avatars';
import { Button } from '@/components/ui/button';
import { DirectMessageComposeDialog } from '@/components/direct-message-compose-dialog';
import { prisma } from '@/lib/prisma';
import { messageHtmlToText } from '@/lib/message-html';

function participantName(participant: DirectMessageInboxItem['participants'][number]) {
  return participant.displayName || participant.name || 'Workspace member';
}

function conversationName(item: DirectMessageInboxItem) {
  if (item.type === 'DIRECT' && item.directKey === null && !item.name.startsWith('dm-group-')) {
    return item.name;
  }
  if (item.participants.length === 1) return participantName(item.participants[0]);
  if (item.participants.length === 0) return 'Direct message';

  const names = item.participants.slice(0, 3).map(participantName).join(', ');
  return item.participants.length > 3 ? `${names} and ${item.participants.length - 3} more` : names;
}

function messagePreview(item: DirectMessageInboxItem) {
  const content = item.lastMessage ? messageHtmlToText(item.lastMessage.content).replace(/\s+/g, ' ').trim() : '';
  if (content) return content;
  if (item.lastMessage?.attachments.length) return 'Attachment';
  return 'No messages yet';
}

export default async function DirectMessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams?: Promise<{ filter?: string; cursor?: string }>;
}) {
  const { workspaceSlug } = await params;
  const query = searchParams ? await searchParams : {};
  const unreadOnly = query.filter === 'unread';
  const session = await auth();
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    select: { id: true, name: true },
  });

  if (!workspace || !session?.user?.id) return notFound();

  const [inbox, members] = await Promise.all([
    getDirectMessageInbox(workspace.id, 25, query.cursor, unreadOnly),
    getWorkspaceMembers(workspaceSlug),
  ]);
  const filterPath = `/${workspaceSlug}/dms`;

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 md:px-6">
        <div>
          <h1 className="text-xl font-semibold">Direct messages</h1>
          <p className="text-sm text-muted-foreground">
            Private conversations in {workspace.name}
          </p>
        </div>
        <DirectMessageComposeDialog
          workspaceId={workspace.id}
          workspaceSlug={workspaceSlug}
          currentUserId={session.user.id}
          members={members}
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-6">
        <nav aria-label="Direct message filters" className="mx-auto mb-4 flex w-full max-w-3xl gap-1">
          <Button asChild size="sm" variant={unreadOnly ? 'ghost' : 'secondary'}>
            <Link href={filterPath}>All</Link>
          </Button>
          <Button asChild size="sm" variant={unreadOnly ? 'secondary' : 'ghost'}>
            <Link href={`${filterPath}?filter=unread`}>Unread</Link>
          </Button>
        </nav>

        {inbox.items.length === 0 ? (
          <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="rounded-full bg-muted p-3">
              <MessageSquarePlus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">Start a direct message</h2>
            <p className="text-sm text-muted-foreground">
              Choose a workspace member to start a private conversation.
            </p>
            {unreadOnly ? (
              <Button asChild variant="outline">
                <Link href={filterPath}>View all messages</Link>
              </Button>
            ) : (
              <DirectMessageComposeDialog
                workspaceId={workspace.id}
                workspaceSlug={workspaceSlug}
                currentUserId={session.user.id}
                members={members}
              />
            )}
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl space-y-2">
            {inbox.items.map((item) => {
              const name = conversationName(item);
              const isGroup = item.type === 'DIRECT' && item.directKey === null;
              const activity = item.lastMessage?.createdAt ?? item.createdAt;

              return (
                <Link
                  key={item.id}
                  href={`/${workspaceSlug}/${item.id}`}
                  className="flex min-w-0 items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <DirectMessageAvatars
                    participants={item.avatarParticipants}
                    isGroup={isGroup}
                    fallbackName={name}
                    size="inbox"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={item.unreadCount ? 'font-semibold' : 'font-medium'}>
                        {name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(activity, { addSuffix: true })}
                      </span>
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {messagePreview(item)}
                    </span>
                  </span>
                  {item.unreadCount > 0 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                      {item.unreadCount > 99 ? '99+' : item.unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
            {inbox.nextCursor && (
              <div className="flex justify-center pt-3">
                <Button asChild variant="outline">
                  <Link
                    href={`${filterPath}?${new URLSearchParams({
                      ...(unreadOnly ? { filter: 'unread' } : {}),
                      cursor: inbox.nextCursor,
                    }).toString()}`}
                  >
                    Older conversations
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
