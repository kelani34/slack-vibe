import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

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
