'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { TopicEditorDialog } from './topic-editor-dialog';
import { DescriptionEditorDialog } from './description-editor-dialog';
import { leaveChannel } from '@/actions/channel';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface AboutTabProps {
  channel: any;
  currentUserId: string;
  workspaceId: string;
}

export function AboutTab({
  channel,
  currentUserId,
  workspaceId,
}: AboutTabProps) {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);

  async function handleLeave() {
    setIsLeaving(true);
    const result = await leaveChannel(channel.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Left channel');
      router.push(`/${channel.workspace.slug}`);
    }
    setIsLeaving(false);
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-6">
        {/* Topic Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Topics</h3>
            {!channel.isArchived && (
              <TopicEditorDialog channel={channel} workspaceId={workspaceId} />
            )}
          </div>
          {channel.topics && channel.topics.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {channel.topics.map((t: string) => (
                <span
                  key={t}
                  className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs font-medium"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No topics set
            </p>
          )}
        </div>

        <Separator />

        {/* Description Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Description</h3>
            {!channel.isArchived && (
              <DescriptionEditorDialog channel={channel} />
            )}
          </div>
          {channel.description ? (
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {channel.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No description
            </p>
          )}
        </div>

        <Separator />

        {/* Managed By */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Managed by</h3>
          <div className="flex items-center gap-2 max-w-fit bg-muted/50 p-2 rounded-lg">
            <Avatar className="h-6 w-6">
              <AvatarImage src={channel.creator?.image || ''} />
              <AvatarFallback>
                {channel.creator?.name?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">
              {channel.creator?.name || 'Unknown'}
            </span>
          </div>
        </div>

        <Separator />

        {/* Files Section (Placeholder for now) */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Files</h3>
          {/* We can query these later, for now just static or empty */}
          <p className="text-sm text-muted-foreground">No files shared yet.</p>
        </div>

        <Separator />

        {/* Leave Channel */}
        {!channel.isArchived && (
          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/50"
              onClick={handleLeave}
              disabled={isLeaving}
            >
              Leave Channel
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
