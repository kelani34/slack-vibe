'use client';

import { RichTextEditor } from '@/components/rich-text-editor';
import { ScheduledMessages } from '@/components/scheduled-messages';
import { FilePreviewModal } from '@/components/file-preview-modal';
import { TypingIndicator } from '@/components/typing-indicator';
import { useTypingIndicator } from '@/hooks/use-typing-indicator';
import { X, File as FileIcon, FileText } from 'lucide-react';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSendMessage } from '@/hooks/use-send-message';
import '@/styles/editor.css';

interface MessageInputProps {
  channelId: string;
  parentId?: string; // For thread replies
  compact?: boolean;
  placeholder?: string;
  isArchived?: boolean;
  isDisabled?: boolean;
  disabledMessage?: string;
  currentUser?: {
    id: string;
    name: string;
    image?: string | null;
  };
}

export function MessageInput({
  channelId,
  parentId,
  compact = false,
  placeholder = 'Message #channel...',
  isArchived = false,
  isDisabled = false,
  disabledMessage,
  currentUser,
}: MessageInputProps) {
  const [files, setFiles] = useState<File[]>([]);
  // Store blob URLs for cleanup
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { broadcastTyping } = useTypingIndicator(channelId, {
    id: currentUser?.id || 'unknown',
    name: currentUser?.name || 'Anonymous',
    avatarUrl: currentUser?.image || undefined,
  });

  const { mutate: sendMessageMutation, isPending: isSubmitting } =
    useSendMessage({
      channelId,
      parentId,
      currentUser,
    });

  // ... (archived/disabled checks)

  if (isArchived) {
    return (
      <div className="p-4 border-t w-full shrink-0 bg-muted/30">
        <div className="text-center text-sm text-muted-foreground">
          You are viewing an <strong>archived channel</strong>. New messages
          cannot be posted.
        </div>
      </div>
    );
  }

  if (isDisabled) {
    return (
      <div className="p-4 border-t w-full shrink-0 bg-muted/30">
        <div className="text-center text-sm text-muted-foreground">
          {disabledMessage ||
            'You do not have permission to post in this channel.'}
        </div>
      </div>
    );
  }

  async function handleSubmit(html: string, text: string, scheduledAt?: Date) {
    if (!text.trim() && files.length === 0) return;

    sendMessageMutation({ html, files, scheduledAt });

    // Clear local state immediately for optimistic feel
    setFiles([]);
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPreviewUrls([]);
    setPreviewImage(null);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Create preview URLs
    const newPreviewUrls = selectedFiles.map((file) =>
      URL.createObjectURL(file)
    );
    setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
    setFiles((prev) => [...prev, ...selectedFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      className={
        compact
          ? 'relative p-3 border-t shrink-0'
          : 'relative p-4 border-t w-full space-y-2 shrink-0'
      }
    >
      {currentUser && (
        <TypingIndicator
          channelId={channelId}
          currentUser={{
            id: currentUser.id,
            name: currentUser.name,
            avatarUrl: currentUser.image || undefined,
          }}
        />
      )}
      <FilePreviewModal
        url={previewImage}
        onClose={() => setPreviewImage(null)}
        // We need to pass type/name if we have them.
        // But previewImage here is just a string URL.
        // We might need to find the file that corresponds to this URL or change state.
        // Actually, ImagePreviewModal used `previewImage` state which was just string.
        // I should change `previewImage` state to object or find the file.
        // For simplicity, I'll update `setPreviewImage` calls to pass the object or just iterate.
      />

      {/* Preview area */}
      {files.length > 0 && (
        <div className="flex gap-2 overflow-x-auto py-2">
          {files.map((file, i) => (
            <div key={i} className="relative group shrink-0">
              <div
                className="relative h-20 w-20 border rounded-md overflow-hidden cursor-pointer bg-muted"
                onClick={() => setPreviewImage(previewUrls[i])} // This triggers modal
              >
                {file.type.startsWith('image/') ? (
                  <img
                    src={previewUrls[i]}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full w-full p-1 text-center">
                    <FileText className="size-8 text-muted-foreground mb-1" />
                    <span className="text-[10px] w-full truncate px-1 leading-tight">
                      {file.name}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept="image/*,application/pdf,.doc,.docx" // Add mime types as needed
        onChange={handleFileSelect}
      />

      {/* Attachments preview */}
      {files.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-2">
          {files.map((file, i) => (
            <div
              key={i}
              className="relative group bg-muted border rounded-md overflow-hidden size-20 flex items-center justify-center"
            >
              {file.type.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setPreviewImage(URL.createObjectURL(file))}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-2 text-center">
                  <FileIcon className="size-6 mb-1 text-muted-foreground" />
                  <span className="text-[10px] truncate w-full px-1">
                    {file.name}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setFiles((prev) => prev.filter((_, idx) => idx !== i));
                }}
                className="absolute top-0 right-0 p-1 bg-black/50 text-white hover:bg-destructive transition-colors rounded-bl-md opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Rich text editor */}
      <RichTextEditor
        onSubmit={handleSubmit}
        onAttachClick={() => fileInputRef.current?.click()}
        disabled={isSubmitting}
        placeholder={placeholder}
        compact={compact}
        toolbarExtra={
          <ScheduledMessages channelId={channelId} parentId={parentId} />
        }
        channelId={channelId}
        canSend={files.length > 0}
        onTyping={broadcastTyping}
      />

      {isSubmitting && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-md pointer-events-none">
          {/* Optional: Add spinner or progress bar here if you want overlay */}
        </div>
      )}
    </div>
  );
}
