'use client';

import {
  getChannelMembers,
  removeChannelMember,
  addChannelMember,
  getWorkspaceMembersNotInChannel,
  leaveChannel,
} from '@/actions/channel-member';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, LogOut, Search, X, UserMinus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ChannelMembersDialogProps {
  channelId: string;
  workspaceId: string;
  workspaceSlug: string;
  memberCount: number;
  currentUserId: string;
}

export function ChannelMembersDialog({
  channelId,
  workspaceId,
  workspaceSlug,
  memberCount: initialCount,
  currentUserId,
}: ChannelMembersDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: members, isLoading } = useQuery({
    queryKey: ['channel-members', channelId],
    queryFn: () => getChannelMembers(channelId),
    enabled: isOpen,
  });

  const { data: availableMembers } = useQuery({
    queryKey: ['available-members', channelId, workspaceId],
    queryFn: () => getWorkspaceMembersNotInChannel(workspaceId, channelId),
    enabled: isOpen && showAddMembers,
  });

  const memberCount = members?.length ?? initialCount;

  const filteredMembers = members?.filter(
    (m) =>
      m.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAvailable = availableMembers?.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleRemoveMember(userId: string) {
    const result = await removeChannelMember(channelId, userId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Member removed');
      queryClient.invalidateQueries({
        queryKey: ['channel-members', channelId],
      });
      queryClient.invalidateQueries({
        queryKey: ['available-members', channelId],
      });
    }
  }

  async function handleAddMember(userId: string) {
    const result = await addChannelMember(channelId, userId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Member added');
      queryClient.invalidateQueries({
        queryKey: ['channel-members', channelId],
      });
      queryClient.invalidateQueries({
        queryKey: ['available-members', channelId],
      });
      setShowAddMembers(false);
    }
  }

  async function handleLeaveChannel() {
    const result = await leaveChannel(channelId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Left channel');
      setIsOpen(false);
      router.push(`/${workspaceSlug}`);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2">
          <Users className="h-4 w-4" />
          <span className="text-xs">{memberCount}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Members ({memberCount})
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddMembers(!showAddMembers)}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Add
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={handleLeaveChannel}
              >
                <LogOut className="h-4 w-4 mr-1" />
                Leave
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Add Members Section */}
        {showAddMembers && (
          <>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Add to channel</h4>
              <ScrollArea className="h-[150px]">
                {filteredAvailable?.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No available members
                  </p>
                ) : (
                  <div className="space-y-1">
                    {filteredAvailable?.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={user.avatarUrl || user.image || ''}
                            />
                            <AvatarFallback>
                              {user.name?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {user.name || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAddMember(user.id)}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
            <Separator />
          </>
        )}

        {/* Current Members */}
        <ScrollArea className="h-[250px]">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Loading...
            </p>
          ) : filteredMembers?.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No members found
            </p>
          ) : (
            <div className="space-y-1">
              {filteredMembers?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={member.user.avatarUrl || member.user.image || ''}
                      />
                      <AvatarFallback>
                        {member.user.name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {member.user.name || 'Unknown'}
                        {member.user.id === currentUserId && (
                          <span className="text-xs text-muted-foreground ml-1">
                            (you)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.user.email}
                      </p>
                    </div>
                  </div>
                  {member.user.id !== currentUserId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemoveMember(member.user.id)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
