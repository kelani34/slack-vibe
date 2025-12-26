'use client';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';
import { toast } from 'sonner';
import { updateChannel, deleteChannel } from '@/actions/channel';
import { useRouter } from 'next/navigation';
import { ChannelPostingPermission } from '@prisma/client';
import { AlertTriangle } from 'lucide-react';

interface SettingsTabProps {
  channel: any;
  currentUserId: string;
  userRole: string; // WORKSPACE role
}

export function SettingsTab({
  channel,
  currentUserId,
  userRole,
}: SettingsTabProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER';
  const isCreator = channel.creatorId === currentUserId;
  const canManage = isAdmin || isCreator; // Owners/Admins + Creator

  async function handleArchiveToggle(checked: boolean) {
    setIsLoading(true);
    const result = await updateChannel(channel.id, { isArchived: checked });
    if (result.error) toast.error(result.error);
    else {
      toast.success(checked ? 'Channel archived' : 'Channel unarchived');
      router.refresh();
    }
    setIsLoading(false);
  }

  async function handleVisibilityChange(value: 'PUBLIC' | 'PRIVATE') {
    setIsLoading(true);
    const result = await updateChannel(channel.id, { type: value });
    if (result.error) toast.error(result.error);
    else toast.success('Channel visibility updated');
    setIsLoading(false);
  }

  async function handlePermissionChange(value: ChannelPostingPermission) {
    setIsLoading(true);
    const result = await updateChannel(channel.id, {
      postingPermission: value,
    });
    if (result.error) toast.error(result.error);
    else toast.success('Posting permissions updated');
    setIsLoading(false);
  }

  async function handleDelete() {
    if (
      !confirm(
        'Are you sure you want to delete this channel? This action cannot be undone.'
      )
    )
      return;
    setIsLoading(true);
    const result = await deleteChannel(channel.id);
    if (result.error) toast.error(result.error);
    else {
      toast.success('Channel deleted');
      router.push(`/${channel.workspace.slug}`);
    }
    setIsLoading(false);
  }

  if (!canManage) {
    return (
      <div className="p-4 text-center text-muted-foreground flex flex-col items-center gap-2">
        <AlertTriangle className="h-8 w-8 text-yellow-500" />
        <p>You don't have permission to manage this channel's settings.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-6">
        {/* Archive */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base">Archive Channel</Label>
            <p className="text-sm text-muted-foreground">
              Prevent new messages, but keep history.
            </p>
          </div>
          <Switch
            checked={channel.isArchived}
            onCheckedChange={handleArchiveToggle}
            disabled={isLoading}
          />
        </div>

        {/* Visibility */}
        {!channel.isArchived && (
          <div className="space-y-3">
            <Label>Channel Visibility</Label>
            <Select
              value={channel.type}
              onValueChange={(val: any) => handleVisibilityChange(val)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC">
                  Public - Anyone in workspace can join
                </SelectItem>
                <SelectItem value="PRIVATE">Private - Invite only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Posting Permissions */}
        {!channel.isArchived && (
          <div className="space-y-3">
            <Label>Who can post?</Label>
            <Select
              value={channel.postingPermission}
              onValueChange={(val: any) => handlePermissionChange(val)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EVERYONE">Everyone</SelectItem>
                <SelectItem value="ADMIN_ONLY">Admins Only</SelectItem>
                <SelectItem value="OWNER_ONLY">Owner Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <Separator />

        {/* Share Channel */}
        {!channel.isArchived && (
          <div className="space-y-3">
            <Label>Share Channel</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  const url = `${window.location.origin}/${channel.workspace.slug}/${channel.id}`;
                  navigator.clipboard.writeText(url);
                  toast.success('Channel link copied to clipboard');
                }}
              >
                Copy Channel Link
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link to invite people to this channel.
            </p>
          </div>
        )}

        {/* Delete */}
        <div className="pt-4 border-t">
          <h4 className="text-destructive font-medium mb-2">Danger Zone</h4>
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleDelete}
            disabled={isLoading}
          >
            Delete Channel
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
