'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { updateChannel } from '@/actions/channel';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface DescriptionEditorDialogProps {
  channel: any;
}

export function DescriptionEditorDialog({
  channel,
}: DescriptionEditorDialogProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(channel.description || '');
  const router = useRouter();

  async function handleSave() {
    const result = await updateChannel(channel.id, { description });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Description updated');
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-6 text-xs px-2">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Description</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this channel about?"
            rows={5}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
