import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
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
  if (!session?.user) return redirect('/login');

  const { workspaceSlug } = await params;

  // Fetch current workspace
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  });

  if (!workspace) return notFound();

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
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
