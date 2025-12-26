'use client';

import {
  getChannelMembers,
  removeChannelMember,
  addChannelMember,
  getWorkspaceMembersNotInChannel,
} from '@/actions/channel-member';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Search, UserMinus, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useProfileStore } from '@/stores/profile-store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MembersTabProps {
  channelId: string;
  workspaceId: string;
  currentUserId: string;
  onOpenChange?: (open: boolean) => void;
  isArchived: boolean;
  channelCreatorId?: string | null;
}

export function MembersTab({
  channelId,
  workspaceId,
  currentUserId,
  onOpenChange,
  isArchived,
  channelCreatorId,
}: MembersTabProps) {
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const queryClient = useQueryClient();
  const { setActiveProfile } = useProfileStore();

  const { data: members, isLoading } = useQuery({
    queryKey: ['channel-members', channelId],
    queryFn: () => getChannelMembers(channelId),
  });

  const { data: availableMembers } = useQuery({
    queryKey: ['available-members', channelId, workspaceId],
    queryFn: () => getWorkspaceMembersNotInChannel(workspaceId, channelId),
    enabled: showAddMembers,
  });

  const filteredMembers = members?.filter((m) => {
    const matchesSearch =
      m.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.user.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const role = (m.user as any).role || 'MEMBER';
    const matchesRole =
      roleFilter === 'ALL'
        ? true
        : roleFilter === 'ADMIN'
        ? ['ADMIN', 'OWNER'].includes(role)
        : role === 'MEMBER';

    return matchesSearch && matchesRole;
  });

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
        queryKey: ['available-members', channelId, workspaceId],
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
        queryKey: ['available-members', channelId, workspaceId],
      });
      setShowAddMembers(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Channel Members</h3>
        {!isArchived && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddMembers(!showAddMembers)}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Add Members
          </Button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Member Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Members</SelectItem>
            <SelectItem value="ADMIN">Admins</SelectItem>
            <SelectItem value="MEMBER">Members</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Add Members Section */}
      {showAddMembers && (
        <>
          <div className="space-y-2 border rounded-md p-2 bg-muted/20">
            <h4 className="text-sm font-medium">Add to channel</h4>
            <ScrollArea className="h-[150px]">
              {filteredAvailable?.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No available members to add
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
      <ScrollArea className="h-[300px]">
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
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                onClick={() => {
                  setActiveProfile(member.user.id);
                  onOpenChange?.(false);
                }}
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
                      {member.user.id === channelCreatorId && (
                        <span className="text-xs text-muted-foreground ml-1 font-semibold">
                          (Manager)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.user.email}
                    </p>
                  </div>
                </div>
                {member.user.id !== currentUserId &&
                  member.user.id !== channelCreatorId &&
                  !isArchived && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent opening profile
                        handleRemoveMember(member.user.id);
                      }}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
