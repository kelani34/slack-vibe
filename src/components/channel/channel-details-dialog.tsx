'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AboutTab } from './about-tab';
import { MembersTab } from './members-tab';
import { SettingsTab } from './settings-tab';
import { Hash, Lock } from 'lucide-react';
import { useState } from 'react';

interface ChannelDetailsDialogProps {
  channel: any;
  currentUserId: string;
  workspaceId: string;
  userRole: string; // Workspace role
  children: React.ReactNode; // The trigger
}

export function ChannelDetailsDialog({
  channel,
  currentUserId,
  workspaceId,
  userRole,
  children,
}: ChannelDetailsDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            {channel.type === 'PRIVATE' ? (
              <Lock className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Hash className="h-5 w-5 text-muted-foreground" />
            )}
            {channel.name}
            {channel.isArchived && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground font-normal">
                Archived
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs
          defaultValue="about"
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 border-b shrink-0">
            <TabsList className="w-full justify-start h-10 bg-transparent p-0">
              <TabsTrigger
                value="about"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-2 pt-1 font-semibold text-muted-foreground data-[state=active]:text-foreground shadow-none transition-none"
              >
                About
              </TabsTrigger>
              <TabsTrigger
                value="members"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-2 pt-1 font-semibold text-muted-foreground data-[state=active]:text-foreground shadow-none transition-none"
              >
                Members
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-2 pt-1 font-semibold text-muted-foreground data-[state=active]:text-foreground shadow-none transition-none"
              >
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden p-6 pt-4">
            <TabsContent value="about" className="h-full mt-0 border-0 p-0">
              <AboutTab
                channel={channel}
                currentUserId={currentUserId}
                workspaceId={workspaceId}
              />
            </TabsContent>
            <TabsContent value="members" className="h-full mt-0 border-0 p-0">
              <MembersTab
                channelId={channel.id}
                workspaceId={workspaceId}
                currentUserId={currentUserId}
                onOpenChange={setOpen}
                isArchived={channel.isArchived}
                channelCreatorId={channel.creatorId}
              />
            </TabsContent>
            <TabsContent value="settings" className="h-full mt-0 border-0 p-0">
              <SettingsTab
                channel={channel}
                currentUserId={currentUserId}
                userRole={userRole}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
