'use client';

import { getUserProfile, hideUser } from '@/actions/user';
import { getOrCreateDirectMessage } from '@/actions/channel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfileStore } from '@/stores/profile-store';
import { useQuery } from '@tanstack/react-query';
import { differenceInMinutes } from 'date-fns';
import {
  X,
  MessageSquare,
  MoreHorizontal,
  Copy,
  Link,
  EyeOff,
  Mail,
  Github,
  Circle,
  Pencil,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { EditProfileDialog } from '@/components/edit-profile-dialog';

interface ProfileSidebarProps {
  workspaceSlug: string;
  workspaceId: string;
  currentUserId: string;
  onBack?: () => void;
}

export function ProfileSidebar({
  workspaceSlug,
  workspaceId,
  currentUserId,
  onBack,
}: ProfileSidebarProps) {
  const router = useRouter();
  const activeProfileUserId = useProfileStore(
    (state) => state.activeProfileUserId
  );
  const setActiveProfile = useProfileStore((state) => state.setActiveProfile);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { data: user, isLoading, isError, refetch } = useQuery({
    queryKey: ['user-profile', activeProfileUserId, workspaceId, currentUserId],
    queryFn: () =>
      activeProfileUserId ? getUserProfile(activeProfileUserId, workspaceId) : null,
    enabled: !!activeProfileUserId,
  });

  if (!activeProfileUserId) return null;

  const isOwnProfile = activeProfileUserId === currentUserId;
  const isOnline = user?.lastSeenAt
    ? differenceInMinutes(new Date(), new Date(user.lastSeenAt)) < 5
    : false;

  async function handleCopyId() {
    if (user?.id) {
      await navigator.clipboard.writeText(user.id);
      toast.success('Member ID copied');
    }
  }

  async function handleCopyName() {
    const nameToUse = user?.displayName || user?.name;
    if (nameToUse) {
      await navigator.clipboard.writeText(nameToUse);
      toast.success('Display name copied');
    }
  }

  async function handleShareProfile() {
    const url = `${window.location.origin}/${workspaceSlug}/profile/${user?.id}`;
    await navigator.clipboard.writeText(url);
    toast.success('Profile link copied');
  }

  async function handleHideUser() {
    if (!user?.id) return;
    const result = await hideUser(user.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('User hidden. Their messages will be filtered out.');
      setActiveProfile(null);
    }
  }

  async function handleStartDM() {
    if (!user?.id) return;
    const workspace = await getOrCreateDirectMessage(workspaceId, user.id);
    if (workspace.error || !workspace.channelId) {
      toast.error(workspace.error || 'Unable to start direct message');
      return;
    }
    setActiveProfile(null);
    router.push(`/${workspaceSlug}/${workspace.channelId}`);
    router.refresh();
  }

  const displayName = user?.displayName || user?.name || 'Unknown User';

  return (
    <>
      <div className="absolute inset-0 z-20 flex h-full w-full flex-col border-l bg-background sm:static sm:w-80">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-1">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 sm:h-8 sm:w-8"
                onClick={onBack}
                aria-label="Back to conversation"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h3 className="font-semibold">Profile</h3>
          </div>
          <div className="flex items-center gap-1">
            {isOwnProfile ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 sm:h-8 sm:w-8"
                onClick={() => setShowEditDialog(true)}
                aria-label="Edit profile"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 sm:h-8 sm:w-8"
                    aria-label="More profile actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleCopyId}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy member ID
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyName}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy display name
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShareProfile}>
                    <Link className="h-4 w-4 mr-2" />
                    Share link to profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleHideUser}
                    className="text-destructive"
                  >
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide user
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 sm:h-8 sm:w-8"
              onClick={() => setActiveProfile(null)}
              aria-label="Close profile"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div role="status" aria-label="Loading profile" className="flex-1 p-6">
            <div aria-hidden="true" className="flex flex-col items-center">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="mt-4 h-6 w-40" />
              <Skeleton className="mt-2 h-4 w-24" />
              <Skeleton className="mt-6 h-10 w-36 rounded-md" />
            </div>
          </div>
        ) : isError && !user ? (
          <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">Couldn’t load this profile.</p>
            <Button variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : user ? (
          <div className="flex-1 overflow-auto">
            {isError && (
              <div role="alert" className="flex items-center justify-between gap-3 border-b p-3 text-sm text-muted-foreground">
                <span>Couldn’t refresh this profile.</span>
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                  Try again
                </Button>
              </div>
            )}
            {/* Profile Header */}
            <div className="p-6 flex flex-col items-center text-center">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.avatarUrl || user.image || ''} />
                  <AvatarFallback className="text-2xl">
                    {displayName[0]}
                  </AvatarFallback>
                </Avatar>
                {/* Online indicator */}
                <div
                  className={`absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-background flex items-center justify-center ${
                    isOnline ? 'bg-success' : 'bg-muted-foreground'
                  }`}
                >
                  <Circle className="h-2 w-2 fill-white text-white" />
                </div>
              </div>
              <h2 className="mt-4 text-xl font-semibold">{displayName}</h2>
              {user.displayName &&
                user.name &&
                user.displayName !== user.name && (
                  <p className="text-sm text-muted-foreground">{user.name}</p>
                )}
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isOnline ? 'bg-success' : 'bg-muted-foreground'
                  }`}
                />
                <span className="text-sm text-muted-foreground">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              {user.timezone && (
                <p className="text-xs text-muted-foreground mt-1">
                  {user.timezone.replace('_', ' ')}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            {!isOwnProfile && (
              <div className="px-6 pb-4">
                <Button onClick={handleStartDM} className="w-full gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Message
                </Button>
              </div>
            )}

            {isOwnProfile && (
              <div className="px-6 pb-4">
                <Button
                  onClick={() => setShowEditDialog(true)}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Profile
                </Button>
              </div>
            )}

            <Separator />

            {/* Contact Information */}
            <div className="p-6">
              <h4 className="text-sm font-medium mb-4">Contact Information</h4>
              <div className="space-y-4">
                {user.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <a
                        href={`mailto:${user.email}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {user.email}
                      </a>
                    </div>
                  </div>
                )}
                {user.githubUrl && (
                  <div className="flex items-center gap-3">
                    <Github className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">GitHub</p>
                      <a
                        href={user.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {user.githubUrl.replace('https://github.com/', '@')}
                      </a>
                    </div>
                  </div>
                )}
                {!user.githubUrl && !user.email && (
                  <p className="text-sm text-muted-foreground">
                    No contact information
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">User not found</p>
          </div>
        )}
      </div>

      {/* Edit Profile Dialog */}
      {user && (
        <EditProfileDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          user={user}
        />
      )}
    </>
  );
}
