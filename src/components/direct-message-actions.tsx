'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, MoreHorizontal, Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { leaveDirectMessage, renameGroupDirectMessage } from '@/actions/channel';
import { Button } from '@/components/ui/button';
import { DirectMessageComposeDialog, type DirectMessageMember } from '@/components/direct-message-compose-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type DirectMessageActionsProps = {
  channelId: string;
  workspaceId: string;
  workspaceSlug: string;
  currentUserId: string;
  initialName: string;
  members: DirectMessageMember[];
  participantIds: string[];
};

export function DirectMessageActions({
  channelId,
  workspaceId,
  workspaceSlug,
  currentUserId,
  initialName,
  members,
  participantIds,
}: DirectMessageActionsProps) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await renameGroupDirectMessage(channelId, name);
      if (result.error) {
        setError(result.error);
        return;
      }
      setRenameOpen(false);
      setError(null);
      toast.success('Group name updated');
      router.refresh();
    });
  }

  function confirmLeave() {
    startTransition(async () => {
      const result = await leaveDirectMessage(channelId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setLeaveOpen(false);
      toast.success('You left the group conversation');
      router.push(`/${workspaceSlug}/dms`);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <DirectMessageComposeDialog
          workspaceId={workspaceId}
          workspaceSlug={workspaceSlug}
          currentUserId={currentUserId}
          members={members}
          initialSelectedIds={participantIds}
          requireAdditionalSelection
          triggerLabel="Add people"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Group conversation actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
              <Pencil />
              Rename group
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setLeaveOpen(true)}>
              <LogOut />
              Leave group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename group conversation</DialogTitle>
            <DialogDescription>Choose a name that helps everyone recognize this group.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitRename} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-conversation-name">Group name</Label>
              <Input
                id="group-conversation-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                autoFocus
              />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenameOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !name.trim()}>
                {isPending ? 'Saving…' : 'Save name'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this group conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              You will lose access to new messages in this group. Rejoining requires a new invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeave} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending ? 'Leaving…' : 'Leave group'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
