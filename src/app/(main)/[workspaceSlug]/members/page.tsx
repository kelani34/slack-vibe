import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { notFound } from 'next/navigation';

export default async function MembersPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { workspaceSlug } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: {
      members: {
        include: {
          user: true,
        },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });

  if (!workspace) return notFound();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-muted-foreground">
          {workspace.members.length} members in {workspace.name}
        </p>
      </div>

      <div className="grid gap-4">
        {workspace.members.map((member) => (
          <Card key={member.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <Avatar>
                <AvatarImage src={member.user.avatarUrl || ''} />
                <AvatarFallback>{member.user.name?.[0] || '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{member.user.name || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">
                  {member.user.email}
                </p>
              </div>
              <Badge
                variant={member.role === 'OWNER' ? 'default' : 'secondary'}
              >
                {member.role}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
