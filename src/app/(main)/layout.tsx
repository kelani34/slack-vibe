import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) return redirect('/login');

  // This layout just ensures authentication
  // The workspace-specific layout handles the sidebar
  return <>{children}</>;
}
