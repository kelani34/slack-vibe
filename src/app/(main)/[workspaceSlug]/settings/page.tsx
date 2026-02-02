import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { notFound } from 'next/navigation';
import { Copy } from 'lucide-react';
import { NotificationSettings } from '@/components/notification-settings';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { workspaceSlug } = await params;

  const [workspace, currentUser] = await Promise.all([
    prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
    }),
    prisma.user.findUnique({
        where: { id: session.user.id },
        select: { emailNotifications: true, pushNotifications: true }
    })
  ]);

  if (!workspace) return notFound();

  const inviteLink = `${
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  }/invite/${workspace.inviteCode}`;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Workspace Settings</h1>
        <p className="text-muted-foreground">Manage your workspace</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Basic workspace information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Workspace Name</Label>
            <Input value={workspace.name} disabled />
          </div>
          <div className="space-y-2">
            <Label>Workspace URL</Label>
            <Input value={`/${workspace.slug}`} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite Members</CardTitle>
          <CardDescription>
            Share this link to invite people to your workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={inviteLink} readOnly className="font-mono text-sm" />
            <Button variant="outline" size="icon">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Invite code:{' '}
            <code className="bg-muted px-1 rounded">
              {workspace.inviteCode}
            </code>
          </p>
        </CardContent>
      </Card>

      <NotificationSettings 
        initialPreferences={{
          emailNotifications: currentUser?.emailNotifications ?? true,
          pushNotifications: currentUser?.pushNotifications ?? true,
        }} 
      />

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" disabled>
            Delete Workspace
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
