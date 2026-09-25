import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { getWorkspaces } from '@/actions/workspace';
import { getChannels } from '@/actions/channel';
import { getStarredChannels } from '@/actions/star';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return redirect('/login');

  const { workspaceSlug } = await params;

  // Fetch current workspace
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  });

  if (!workspace) return notFound();

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: session.user.id,
      },
    },
    select: { id: true },
  });
  if (!membership) return notFound();

  // Fetch all data in parallel
  const [workspaces, channels, starredChannels] = await Promise.all([
    getWorkspaces(),
    getChannels(workspace.id),
    getStarredChannels(workspace.id),
  ]);

  const user = {
    id: session.user.id || '',
    name: session.user.name || 'User',
    email: session.user.email || '',
    avatar: session.user.image || '',
  };

  return (
    <SidebarProvider>
      <AppSidebar
        workspaces={workspaces}
        currentWorkspace={workspace}
        channels={channels}
        starredChannels={starredChannels}
        user={user}
      />
      <SidebarInset className="h-screen">
        <main className="flex flex-1 flex-col h-full overflow-hidden">
          <header className="flex h-12 shrink-0 items-center border-b px-2 md:hidden">
            <SidebarTrigger />
            <span className="ml-2 text-sm font-medium">{workspace.name}</span>
          </header>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
