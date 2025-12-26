import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { getDistinctTopics, updateChannel } from '@/actions/channel';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface TopicEditorDialogProps {
  channel: any;
  workspaceId: string;
}

export function TopicEditorDialog({
  channel,
  workspaceId,
}: TopicEditorDialogProps) {
  const [open, setOpen] = useState(false);
  const [topics, setTopics] = useState<string[]>(channel.topics || []);
  const [inputValue, setInputValue] = useState('');
  const [existingTopics, setExistingTopics] = useState<string[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setTopics(channel.topics || []);
      getDistinctTopics(workspaceId).then(setExistingTopics);
    }
  }, [open, workspaceId, channel.topics]);

  async function handleSave() {
    const result = await updateChannel(channel.id, { topics });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Topics updated');
      setOpen(false); // Close dialog on save as requested
      router.refresh();
    }
  }

  const addTopic = (topic: string) => {
    const trimmed = topic.trim();
    if (trimmed && !topics.includes(trimmed)) {
      setTopics([...topics, trimmed]);
    }
    setInputValue('');
    // Keep focus for continuous adding if desired, or let it blur.
    // User workflow "pick from there" implies selecting one.
  };

  const removeTopic = (topic: string) => {
    setTopics(topics.filter((t) => t !== topic));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Only add if input has value
      if (inputValue.trim()) {
        addTopic(inputValue);
      }
    }
  };

  const suggestions = existingTopics.filter(
    (t) =>
      t.toLowerCase().includes(inputValue.toLowerCase()) &&
      !topics.includes(t) &&
      t !== inputValue
  );

  // Show if: (focused OR input has value) AND there are suggestions
  const showSuggestions =
    (isInputFocused || inputValue.length > 0) && suggestions.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] overflow-visible">
        <DialogHeader>
          <DialogTitle>Edit Channel Topics</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Topics</p>

            <div className="flex flex-wrap gap-2 mb-2 p-2 border rounded-md min-h-[40px] bg-background">
              {topics.length === 0 && (
                <span className="text-muted-foreground text-sm italic">
                  No topics added
                </span>
              )}
              {topics.map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {t}
                  <button
                    onClick={() => removeTopic(t)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div className="relative">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => {
                    // Delay hide to allow clicking suggestion
                    setTimeout(() => setIsInputFocused(false), 200);
                  }}
                  placeholder="Type a topic and press Enter..."
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => addTopic(inputValue)}
                  disabled={!inputValue.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-10 z-50 mt-1 max-h-[150px] overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                  {suggestions.map((t) => (
                    <div
                      key={t}
                      className="cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                      onClick={() => addTopic(t)}
                    >
                      {t}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              These topics will appear in the channel info.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Topics</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
