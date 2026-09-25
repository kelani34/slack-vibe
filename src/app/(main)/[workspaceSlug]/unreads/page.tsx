import Link from 'next/link';
import { ArrowUpRight, Inbox } from 'lucide-react';
import { notFound } from 'next/navigation';

import { auth } from '@/auth';
import { getUnreadInbox, type UnreadInboxItem } from '@/actions/channel';
import { DirectMessageAvatars } from '@/components/direct-message-avatars';
import { MarkUnreadConversationRead } from '@/components/mark-unread-conversation-read';
import { prisma } from '@/lib/prisma';

function participantName(participant: UnreadInboxItem['participants'][number]) {
  return participant.displayName || participant.name || 'Workspace member';
}

function conversationName(item: UnreadInboxItem) {
  const isDirect = item.type === 'DIRECT' || item.name.startsWith('dm-');
  if (item.type === 'DIRECT' && item.directKey === null && !item.name.startsWith('dm-group-')) {
    return item.name;
  }
  if (!isDirect) return `#${item.name}`;
  if (item.participants.length === 1) return participantName(item.participants[0]);
  if (item.participants.length === 0) return 'Direct message';

  const names = item.participants.slice(0, 3).map(participantName).join(', ');
  return item.participants.length > 3 ? `${names} and ${item.participants.length - 3} more` : names;
}

export default async function UnreadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams?: Promise<{ cursor?: string }>;
}) {
  const { workspaceSlug } = await params;
  const query = searchParams ? await searchParams : {};
  const session = await auth();
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    select: { id: true, name: true },
  });
  if (!workspace || !session?.user?.id) return notFound();

  const inbox = await getUnreadInbox(workspace.id, 25, query.cursor);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="border-b px-4 py-4 md:px-6">
        <h1 className="text-xl font-semibold">Unread</h1>
        <p className="text-sm text-muted-foreground">
          Unread conversations in {workspace.name}. Opening the list does not mark messages read.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-6">
        {inbox.items.length === 0 ? (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-3 py-20 text-center">
            <div className="rounded-full bg-muted p-3">
              <Inbox aria-hidden className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">You are all caught up</h2>
            <p className="text-sm text-muted-foreground">
              New unread messages from conversations you can access will appear here.
            </p>
          </div>
        ) : (
          <ul aria-label="Unread conversations" className="mx-auto w-full max-w-3xl space-y-2">
            {inbox.items.map((item) => {
              const name = conversationName(item);
              const isDirect = item.type === 'DIRECT' || item.name.startsWith('dm-');
              const isGroup = item.type === 'DIRECT' && item.directKey === null;
              const target = `/${workspaceSlug}/${item.id}?message=${encodeURIComponent(item.firstUnreadMessageId)}`;

              return (
                <li key={item.id} className="flex min-w-0 flex-wrap items-center gap-3 rounded-lg border p-3">
                  <Link
                    href={target}
                    aria-label={`Open first unread in ${name}`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {isDirect && (
                      <DirectMessageAvatars
                        participants={item.avatarParticipants}
                        isGroup={isGroup}
                        fallbackName={name}
                        size="inbox"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{name}</span>
                      <span className="block text-sm text-muted-foreground">
                        {item.unreadCount} unread {item.unreadCount === 1 ? 'message' : 'messages'}
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm text-primary">
                      Open first unread <ArrowUpRight aria-hidden className="h-4 w-4" />
                    </span>
                  </Link>
                  <MarkUnreadConversationRead
                    channelId={item.id}
                    label={`Mark ${name} as read`}
                  />
                </li>
              );
            })}
          </ul>
        )}

        {inbox.nextCursor && (
          <div className="mx-auto mt-4 w-full max-w-3xl text-center">
            <Link
              href={`/${workspaceSlug}/unreads?cursor=${encodeURIComponent(inbox.nextCursor)}`}
              className="inline-flex min-h-10 items-center rounded-md px-4 text-sm font-medium text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Load more unread conversations
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
