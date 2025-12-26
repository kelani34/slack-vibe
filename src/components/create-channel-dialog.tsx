'use client';

import { createChannel } from '@/actions/channel';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface CreateChannelDialogProps {
  workspaceId: string;
}

export function CreateChannelDialog({
  workspaceId,
  children,
}: CreateChannelDialogProps & { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('PUBLIC');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData();
    formData.append('name', name.toLowerCase().replace(/\s+/g, '-'));
    formData.append('type', type);
    formData.append('workspaceId', workspaceId);

    const result = await createChannel(formData);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Channel created!');
      setOpen(false);
      setName('');
      setType('PUBLIC');
    }
    setIsLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="h-5 w-5">
            <Plus className="h-4 w-4" />
            <span className="sr-only">Create channel</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a channel</DialogTitle>
          <DialogDescription>
            Channels are where your team communicates. They're best organized
            around a topic.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. marketing"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
              />
              <p className="text-xs text-muted-foreground">
                Names must be lowercase, without spaces. Use dashes instead.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Visibility</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">
                    Public - Anyone can join
                  </SelectItem>
                  <SelectItem value="PRIVATE">Private - Invite only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Creating...' : 'Create Channel'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
