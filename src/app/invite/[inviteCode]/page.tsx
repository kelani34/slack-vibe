import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { joinWorkspaceByCode } from '@/actions/workspace';

export default async function InvitePage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const session = await auth();
  const { inviteCode } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { inviteCode },
    select: { id: true, name: true },
  });

  if (!workspace) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invite Not Found</CardTitle>
            <CardDescription>
              The invite link you used is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/">Go Home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  async function handleJoin() {
    'use server';
    const result = await joinWorkspaceByCode(inviteCode);
    if (result.error) {
      // Ideally we show toast but server actions in server components can't trigger client toasts easily without a client component wrapper.
      // For now, let's redirect to an error or handle it.
      // Actually, the best pattern for this is a Client Component wrapper for the button/form.
      throw new Error(result.error);
    }
    if (result.success) {
      redirect(`/${result.slug}`);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-xl flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-primary">
              {workspace.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <CardTitle>Join {workspace.name}</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join the{' '}
            <strong>{workspace.name}</strong> workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {session?.user ? (
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
              <Avatar>
                <AvatarImage src={session.user.image || ''} />
                <AvatarFallback>{session.user.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">Logged in as</p>
                <p className="text-sm text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              Please log in to accept this invitation.
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {session?.user ? (
            <form action={handleJoin} className="w-full">
              <Button className="w-full" size="lg">
                Join Workspace
              </Button>
            </form>
          ) : (
            <div className="w-full space-y-2">
              <Button asChild className="w-full" size="lg">
                <Link href={`/login?callbackUrl=/invite/${inviteCode}`}>
                  Log In to Join
                </Link>
              </Button>
              <div className="text-center text-xs text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link
                  href={`/login?callbackUrl=/invite/${inviteCode}`}
                  className="underline"
                >
                  Sign up
                </Link>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
