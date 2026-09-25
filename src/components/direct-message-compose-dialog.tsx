'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquarePlus } from 'lucide-react';

import { createGroupDirectMessage, getOrCreateDirectMessage } from '@/actions/channel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  clearGroupCreationIntent,
  getOrCreateGroupCreationIntent,
  type GroupCreationIntent,
} from '@/lib/group-creation-intent';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type DirectMessageMember = {
  id: string;
  name: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  image: string | null;
  email?: string | null;
};

type DirectMessageComposeDialogProps = {
  workspaceId: string;
  workspaceSlug: string;
  currentUserId: string;
  members: DirectMessageMember[];
  initialSelectedIds?: string[];
  initialDisplayName?: string;
  requireAdditionalSelection?: boolean;
  triggerLabel?: string;
};

function memberName(member: DirectMessageMember) {
  return member.displayName || member.name || member.email || 'Workspace member';
}

export function DirectMessageComposeDialog({
  workspaceId,
  workspaceSlug,
  currentUserId,
  members,
  initialSelectedIds = [],
  initialDisplayName = '',
  requireAdditionalSelection = false,
  triggerLabel = 'New message',
}: DirectMessageComposeDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [groupCreationIntent, setGroupCreationIntent] = useState<GroupCreationIntent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const availableMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return members
      .filter((member) => member.id !== currentUserId)
      .filter((member) => {
        if (!normalizedQuery) return true;
        return `${memberName(member)} ${member.email || ''}`.toLowerCase().includes(normalizedQuery);
      })
      .sort((left, right) => memberName(left).localeCompare(memberName(right)));
  }, [currentUserId, members, query]);

  function reset() {
    setQuery('');
    setSelectedIds(initialSelectedIds);
    setDisplayName(initialDisplayName);
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) reset();
  }

  function toggleMember(memberId: string, checked: boolean | 'indeterminate') {
    if (checked === true) {
      if (selectedIds.length >= 7) {
        setError('Group conversations can include up to seven other members.');
        return;
      }
      setSelectedIds((current) => (current.includes(memberId) ? current : [...current, memberId]));
      setError(null);
      return;
    }

    setSelectedIds((current) => current.filter((id) => id !== memberId));
    setError(null);
  }

  function submit() {
    if (selectedIds.length === 0) {
      setError('Choose a workspace member to message.');
      return;
    }
    if (requireAdditionalSelection && !selectedIds.some((id) => !initialSelectedIds.includes(id))) {
      setError('Choose at least one additional member.');
      return;
    }
    if (requireAdditionalSelection && selectedIds.length < 2) {
      setError('Keep at least two other members in the new group.');
      return;
    }

    startTransition(async () => {
      let result;
      let completedGroupIntent: GroupCreationIntent | null = null;
      try {
        if (selectedIds.length === 1 && !requireAdditionalSelection) {
          result = await getOrCreateDirectMessage(workspaceId, selectedIds[0]);
        } else {
          const request = JSON.stringify({
            workspaceId,
            participantIds: [...selectedIds].sort(),
            displayName: displayName.trim() || null,
          });
          const intent = groupCreationIntent?.request === request
            ? groupCreationIntent
            : getOrCreateGroupCreationIntent(currentUserId, workspaceId, request);
          if (!intent) {
            setError('Could not preserve this request for a safe retry. Enable browser storage and try again.');
            return;
          }
          completedGroupIntent = intent;
          setGroupCreationIntent(intent);
          result = await createGroupDirectMessage(
            workspaceId,
            selectedIds,
            intent.clientMutationId,
            displayName,
          );
        }
      } catch {
        setError('Could not confirm this conversation. Retry to continue safely.');
        return;
      }

      if (result.error || !result.channelId) {
        setError(result.error || 'Could not open this conversation.');
        return;
      }

      if (completedGroupIntent) {
        clearGroupCreationIntent(currentUserId, workspaceId, completedGroupIntent.clientMutationId);
      }
      setGroupCreationIntent(null);
      setOpen(false);
      reset();
      router.push(`/${workspaceSlug}/${result.channelId}`);
      router.refresh();
    });
  }

  const isGroup = selectedIds.length > 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <MessageSquarePlus />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(80vh,42rem)] overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-4 py-4 text-left sm:px-6">
          <DialogTitle>
            {requireAdditionalSelection ? 'Create a new group conversation' : 'New direct message'}
          </DialogTitle>
          <DialogDescription>
            {requireAdditionalSelection
              ? 'Adding someone starts a new group conversation. They will not be able to read messages from this one.'
              : 'Choose one person for a DM or several people for a private group conversation.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search workspace members"
            aria-label="Search workspace members"
          />

          <div className="space-y-1" role="group" aria-label="Workspace members">
            {availableMembers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No members match your search.</p>
            ) : (
              availableMembers.map((member) => {
                const name = memberName(member);
                const checked = selectedIds.includes(member.id);
                return (
                  <Label
                    key={member.id}
                    htmlFor={`direct-member-${member.id}`}
                    className="cursor-pointer rounded-md px-2 py-2.5 transition-colors hover:bg-accent has-[[data-state=checked]]:bg-accent"
                  >
                    <Checkbox
                      id={`direct-member-${member.id}`}
                      checked={checked}
                      onCheckedChange={(value) => toggleMember(member.id, value)}
                      aria-label={`Message ${name}`}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatarUrl || member.image || undefined} alt="" />
                      <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{name}</span>
                      {member.email && <span className="block truncate text-xs text-muted-foreground">{member.email}</span>}
                    </span>
                  </Label>
                );
              })
            )}
          </div>

          {isGroup && (
            <div className="space-y-2">
              <Label htmlFor="direct-group-name">Group name (optional)</Label>
              <Input
                id="direct-group-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="e.g. Launch team"
                maxLength={80}
              />
            </div>
          )}

          <p className="text-xs text-muted-foreground" aria-live="polite">
            {selectedIds.length === 0
              ? 'No recipients selected'
              : `${selectedIds.length} recipient${selectedIds.length === 1 ? '' : 's'} selected`}
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="border-t px-4 py-4 sm:px-6">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={isPending || selectedIds.length === 0}>
            {isPending ? 'Opening…' : isGroup ? 'Start group message' : 'Start message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
