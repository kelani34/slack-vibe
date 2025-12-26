'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import { createSuggestion } from './editor/suggestion';
import { getChannelMembers } from '@/actions/channel-member';
import 'tippy.js/dist/tippy.css';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Send,
  Type,
  Paperclip,
  ChevronDown,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';
import { addHours, addMinutes, format, setHours, setMinutes } from 'date-fns';

interface RichTextEditorProps {
  onSubmit: (html: string, text: string, scheduledAt?: Date) => void;
  onAttachClick?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  toolbarExtra?: React.ReactNode;
  initialContent?: string;
  variant?: 'create' | 'edit';
  onCancel?: () => void;
  channelId?: string;
  canSend?: boolean;
  onTyping?: () => void;
}

function ToolbarButton({
  editor,
  action,
  isActive,
  icon: Icon,
  label,
}: {
  editor: Editor | null;
  action: () => void;
  isActive: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Toggle
      size="sm"
      pressed={isActive}
      onPressedChange={action}
      disabled={!editor}
      aria-label={label}
      className="h-7 w-7 p-0"
    >
      <Icon className="h-3.5 w-3.5" />
    </Toggle>
  );
}

export function RichTextEditor({
  onSubmit,
  onAttachClick,
  placeholder = 'Write a message...',
  disabled = false,
  className,
  compact = false,
  toolbarExtra,
  initialContent = '',
  variant = 'create',
  onCancel,
  channelId,
  canSend = false,
  onTyping,
}: RichTextEditorProps) {
  const [showToolbar, setShowToolbar] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [hasContent, setHasContent] = useState(false);
  const isMentionOpenRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: createSuggestion((isOpen) => {
          isMentionOpenRef.current = isOpen;
        }),
      }).configure({
        suggestion: {
          items: async ({ query }) => {
            if (!channelId) return [];
            const members = await getChannelMembers(channelId);
            const filtered = members
              .filter((m) =>
                m.user.name?.toLowerCase().includes(query.toLowerCase())
              )
              .map((m) => ({
                id: m.user.id,
                name: m.user.name,
                avatarUrl: m.user.avatarUrl || m.user.image,
              }))
              .slice(0, 5);

            return filtered;
          },
        },
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none overflow-y-auto px-3 py-2',
          compact ? 'min-h-[32px] max-h-[100px]' : 'min-h-[40px] max-h-[150px]'
        ),
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.metaKey) {
          if (isMentionOpenRef.current) return false; // Add this line
          event.preventDefault();
          handleSubmit();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      setHasContent(!!editor.getText().trim());
      onTyping?.();
    },
    immediatelyRender: false,
  });
  // ...

  function handleSubmit(scheduledAt?: Date) {
    if (!editor) return;
    const html = editor.getHTML();
    const text = editor.getText();

    if (!text.trim() && !canSend) {
      return;
    }

    onSubmit(html, text, scheduledAt);
    editor.commands.clearContent();
  }

  function handleScheduleSubmit() {
    if (!scheduleDate || !scheduleTime) return;

    const [hours, minutes] = scheduleTime.split(':').map(Number);
    let scheduledAt = new Date(scheduleDate);
    scheduledAt = setHours(scheduledAt, hours);
    scheduledAt = setMinutes(scheduledAt, minutes);

    handleSubmit(scheduledAt);
    setShowScheduleDialog(false);
    setScheduleDate('');
    setScheduleTime('');
  }

  function handleQuickSchedule(minutes: number) {
    const scheduledAt = addMinutes(new Date(), minutes);
    handleSubmit(scheduledAt);
  }

  function addLink() {
    const url = window.prompt('Enter URL:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }

  // Set default date/time when opening dialog
  function openScheduleDialog() {
    const tomorrow = addHours(new Date(), 24);
    setScheduleDate(format(tomorrow, 'yyyy-MM-dd'));
    setScheduleTime('09:00');
    setShowScheduleDialog(true);
  }

  return (
    <>
      <div className={cn('border rounded-lg bg-background', className)}>
        {/* Collapsible Toolbar */}
        {showToolbar && (
          <div className="flex items-center gap-0.5 p-1 border-b flex-wrap">
            <ToolbarButton
              editor={editor}
              action={() => editor?.chain().focus().toggleBold().run()}
              isActive={editor?.isActive('bold') ?? false}
              icon={Bold}
              label="Bold"
            />
            <ToolbarButton
              editor={editor}
              action={() => editor?.chain().focus().toggleItalic().run()}
              isActive={editor?.isActive('italic') ?? false}
              icon={Italic}
              label="Italic"
            />
            <ToolbarButton
              editor={editor}
              action={() => editor?.chain().focus().toggleStrike().run()}
              isActive={editor?.isActive('strike') ?? false}
              icon={Strikethrough}
              label="Strikethrough"
            />

            <Separator orientation="vertical" className="mx-1 h-5" />

            <ToolbarButton
              editor={editor}
              action={() => editor?.chain().focus().toggleCode().run()}
              isActive={editor?.isActive('code') ?? false}
              icon={Code}
              label="Inline Code"
            />
            <ToolbarButton
              editor={editor}
              action={addLink}
              isActive={editor?.isActive('link') ?? false}
              icon={LinkIcon}
              label="Add Link"
            />

            <Separator orientation="vertical" className="mx-1 h-5" />

            <ToolbarButton
              editor={editor}
              action={() => editor?.chain().focus().toggleBulletList().run()}
              isActive={editor?.isActive('bulletList') ?? false}
              icon={List}
              label="Bullet List"
            />
            <ToolbarButton
              editor={editor}
              action={() => editor?.chain().focus().toggleOrderedList().run()}
              isActive={editor?.isActive('orderedList') ?? false}
              icon={ListOrdered}
              label="Numbered List"
            />
            <ToolbarButton
              editor={editor}
              action={() => editor?.chain().focus().toggleBlockquote().run()}
              isActive={editor?.isActive('blockquote') ?? false}
              icon={Quote}
              label="Quote"
            />
          </div>
        )}

        {/* Editor */}
        <EditorContent editor={editor} />

        {/* Footer with toggle, attach, and send button */}
        <div className="flex items-center justify-between px-2 py-1.5 border-t">
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-7 w-7', showToolbar && 'bg-muted')}
              onClick={() => setShowToolbar(!showToolbar)}
              title={showToolbar ? 'Hide formatting' : 'Show formatting'}
            >
              <Type
                className={cn(
                  'h-4 w-4',
                  showToolbar &&
                    'text-primary underline decoration-2 underline-offset-4'
                )}
              />
            </Button>
            {onAttachClick && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onAttachClick}
                title="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            )}
            {toolbarExtra}
          </div>

          {/* Send/Save button with schedule dropdown */}
          <div className="flex items-center gap-2">
            {variant === 'edit' && onCancel && (
              <Button size="sm" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}

            {variant === 'create' ? (
              <div className="flex items-center">
                <Button
                  size="icon"
                  className="h-7 w-7 rounded-r-none"
                  onClick={() => handleSubmit()}
                  disabled={disabled || (!hasContent && !canSend)}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      className="h-7 w-5 rounded-l-none border-l border-primary-foreground/20 px-0"
                      disabled={disabled || (!hasContent && !canSend)}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleQuickSchedule(30)}>
                      <Clock className="h-4 w-4 mr-2" />
                      In 30 minutes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleQuickSchedule(60)}>
                      <Clock className="h-4 w-4 mr-2" />
                      In 1 hour
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleQuickSchedule(180)}>
                      <Clock className="h-4 w-4 mr-2" />
                      In 3 hours
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={openScheduleDialog}>
                      <Clock className="h-4 w-4 mr-2" />
                      Custom time...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => handleSubmit()}
                disabled={disabled}
                className="h-7 px-3 text-xs"
              >
                Save
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Schedule message</DialogTitle>
            <DialogDescription>
              Choose when to send this message
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowScheduleDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleScheduleSubmit}
              disabled={!scheduleDate || !scheduleTime}
            >
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
