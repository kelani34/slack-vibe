import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: {
      channels: {
        where: {
          isArchived: false,
        },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  });

  if (!workspace) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Workspace not found</p>
      </div>
    );
  }

  /* 
   * Redirect priority:
   * 1. First channel user is a member of
   * 2. 'general' channel if it exists (and public)
   * 3. Any public channel
   */
  const session = await auth();
  const userId = session?.user?.id;

  if (userId) {
     const memberChannel = await prisma.channelMember.findFirst({
        where: {
           userId: userId,
           channel: {
              workspaceId: workspace.id,
              isArchived: false
           }
        },
        include: {
           channel: true
        },
        orderBy: {
           channel: {
              createdAt: 'asc'
           }
        }
     });

     if (memberChannel) {
        redirect(`/${workspaceSlug}/${memberChannel.channel.id}`);
     }
  }

  // Fallback to first channel found (likely general) if user has no memberships yet?
  // Or maybe they just joined and have no channels.
  if (workspace.channels.length > 0) {
    redirect(`/${workspaceSlug}/${workspace.channels[0].id}`);
  }

  // No channels yet - show empty state
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Welcome to {workspace.name}</h2>
        <p className="text-muted-foreground">
          Create your first channel to get started
        </p>
      </div>
    </div>
  );
}
