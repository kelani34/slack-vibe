import { auth } from '@/auth';
import { getAllChannels } from '@/actions/channel';
import { joinChannel, leaveChannel } from '@/actions/channel-member';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import { BrowseChannelsList } from './browse-channels-list';

interface PageProps {
  params: Promise<{
    workspaceSlug: string;
  }>;
}

export default async function BrowseChannelsPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const session = await auth();

  if (!session?.user) redirect('/login');

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  });

  if (!workspace) return notFound();

  const channels = await getAllChannels(workspace.id);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex h-12 items-center gap-2 border-b px-4 shrink-0">
        <h1 className="font-semibold">Browse channels</h1>
        <span className="text-sm text-muted-foreground">
          {channels.length} channel{channels.length !== 1 ? 's' : ''}
        </span>
      </header>
      <BrowseChannelsList channels={channels} workspaceSlug={workspaceSlug} />
    </div>
  );
}
