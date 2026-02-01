import { auth } from '@/auth';
import { getScheduledMessages } from '@/actions/message';
import { MessageList } from '@/components/message-list';
import { redirect } from 'next/navigation';
import { CalendarClock } from 'lucide-react';
import { prisma } from '@/lib/prisma'; // Direct db access for workspace ID? Or helper.

export default async function ScheduledMessagesPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user) return redirect('/login');

  const { workspaceSlug } = await params;

  // We need to fetch scheduled messages across ALL channels in the workspace?
  // Current action: getScheduledMessages(channelId, parentId).
  // It filters by channelId.
  // We need a workspace-wide fetch.
  
  // Let's create a quick workspace-wide fetch here or in actions.
  // For safety, let's do it in actions but assuming I should move fast, I will query strictly for valid channels.
  const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: { channels: { select: { id: true } } }
  });
  
  if (!workspace) return redirect('/');

  const channelIds = workspace.channels.map(c => c.id);

  const messages = await prisma.message.findMany({
    where: {
      userId: session.user.id,
      channelId: { in: channelIds },
      scheduledAt: { gt: new Date() },
    },
    include: {
      user: true,
      attachments: true,
      channel: true, // Include channel to show where it is scheduled
    },
    orderBy: { scheduledAt: 'asc' },
  });


  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center gap-2 border-b p-4 h-14 shrink-0">
        <CalendarClock className="h-5 w-5" />
        <h1 className="font-semibold text-lg">Scheduled</h1>
      </header>
      
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground p-8">
           <CalendarClock className="h-12 w-12 mb-4 opacity-20" />
           <p>No scheduled messages.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
           {/* Custom list for scheduled messages since MessageList might be too specific to channel view */}
           <div className="space-y-4">
             {messages.map((msg) => (
               <div key={msg.id} className="border rounded-md p-4 bg-card">
                  <div className="flex justify-between mb-2">
                     <span className="text-sm font-medium">To: #{msg.channel?.name}</span>
                     <span className="text-xs text-muted-foreground">
                        Scheduled for: {new Date(msg.scheduledAt!).toLocaleString()}
                     </span>
                  </div>
                  <div className="text-sm">{msg.content}</div>
                  {/* Cancel button logic would go here */}
               </div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
}
