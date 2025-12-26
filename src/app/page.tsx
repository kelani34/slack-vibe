import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getWorkspaces } from '@/actions/workspace';

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const workspaces = await getWorkspaces();

  if (workspaces.length === 0) {
    redirect('/create-workspace');
  }

  // Redirect to first workspace
  redirect(`/${workspaces[0].slug}`);

  return null;
}
