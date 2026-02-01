import { auth } from '@/auth';
import { getBookmarkedMessages } from '@/actions/message';
import { MessageList } from '@/components/message-list';
import { redirect } from 'next/navigation';
import { Bookmark } from 'lucide-react';

export default async function SavedItemsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user) return redirect('/login');

  const { workspaceSlug } = await params;
  const messages = await getBookmarkedMessages(workspaceSlug);

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center gap-2 border-b p-4 h-14 shrink-0">
        <Bookmark className="h-5 w-5" />
        <h1 className="font-semibold text-lg">Saved Items</h1>
      </header>
      
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground p-8">
           <Bookmark className="h-12 w-12 mb-4 opacity-20" />
           <p>No saved items yet.</p>
           <p className="text-sm">Bookmark messages to see them here.</p>
        </div>
      ) : (
        <MessageList 
          messages={messages} 
          channelId="saved" // Pseudo-channel
          workspaceId="" // Optional or fetch if needed
          currentUserId={session.user.id}
        />
      )}
    </div>
  );
}
