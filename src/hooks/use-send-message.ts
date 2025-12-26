import { sendMessage } from '@/actions/message';
import { uploadFile } from '@/actions/upload';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface UseSendMessageProps {
  channelId: string;
  parentId?: string;
  currentUser?: {
    id: string;
    name: string;
    image?: string | null;
  };
}

export function useSendMessage({
  channelId,
  parentId,
  currentUser,
}: UseSendMessageProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      html,
      files = [],
      scheduledAt,
    }: {
      html: string;
      files?: File[];
      scheduledAt?: Date;
    }) => {
      // 1. Upload files first
      const uploadedAttachments: any[] = [];

      if (files.length > 0) {
        // Upload sequentially
        for (const file of files) {
          const formData = new FormData();
          formData.append('file', file);
          const result = await uploadFile(formData);
          if (result.error) throw new Error(result.error);
          if (result.url) {
            uploadedAttachments.push({
              url: result.url,
              name: result.name,
              type: result.type,
              size: result.size,
            });
          }
        }
      }

      // 2. Send message with real URLs
      const formData = new FormData();
      formData.append('channelId', channelId);
      formData.append('content', html);
      formData.append('attachments', JSON.stringify(uploadedAttachments));
      if (parentId) formData.append('parentId', parentId);
      if (scheduledAt)
        formData.append('scheduledAt', scheduledAt.toISOString());

      return await sendMessage(formData);
    },
    onMutate: async ({ html, files = [], scheduledAt }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['messages', channelId] });

      const previousMessages = queryClient.getQueryData([
        'messages',
        channelId,
      ]);

      // Don't optimistically update scheduled messages
      if (scheduledAt) return { previousMessages };

      // Create optimistic attachments from local files
      const optimisticAttachments = files.map((file) => ({
        url: URL.createObjectURL(file), // Use blob URL for immediate preview
        name: file.name,
        type: file.type,
        size: file.size,
        fileObject: file, // Store file object for retry
      }));

      const tempId = `temp-${Date.now()}`;
      const newMessage = {
        id: tempId,
        content: html,
        channelId,
        userId: currentUser?.id || 'unknown',
        createdAt: new Date(),
        updatedAt: new Date(),
        attachments: optimisticAttachments,
        reactions: [],
        replies: [],
        _count: { replies: 0 },
        user: {
          id: currentUser?.id || 'unknown',
          name: currentUser?.name || 'You',
          avatarUrl: currentUser?.image || null,
        },
        items: [],
        type: 'REGULAR',
        isPending: true,
      };

      // Add to main channel
      if (!parentId) {
        queryClient.setQueryData(['messages', channelId], (old: any) => {
          if (!old || !old.pages) return old;
          const newPages = [...old.pages];
          if (newPages.length > 0) {
            newPages[0] = [...newPages[0], newMessage];
          }
          return { ...old, pages: newPages };
        });
      } else {
        // Add to thread
        queryClient.setQueryData(
          ['messages', channelId, parentId],
          (old: any) => {
            if (!old) return [newMessage];
            return [...old, newMessage];
          }
        );

        // Update reply count in main channel
        queryClient.setQueryData(['messages', channelId], (old: any) => {
          if (!old || !old.pages) return old;
          const newPages = old.pages.map((page: any[]) =>
            page.map((msg: any) => {
              if (msg.id === parentId) {
                return {
                  ...msg,
                  _count: {
                    ...msg._count,
                    replies: (msg._count?.replies || 0) + 1,
                  },
                };
              }
              return msg;
            })
          );
          return { ...old, pages: newPages };
        });
      }

      return { previousMessages, tempId };
    },
    onError: (err, variables, context: any) => {
      // Don't revert completely, just mark as error
      // Find the optimistic message and set isError: true
      const { tempId } = context;
      if (!tempId) return;

      toast.error('Failed to send message');

      const updateMessageAsError = (old: any) => {
        if (!old) return old;
        // Handle paginated list
        if (old.pages) {
          const newPages = old.pages.map((page: any[]) =>
            page.map((msg) =>
              msg.id === tempId
                ? { ...msg, isPending: false, isError: true }
                : msg
            )
          );
          return { ...old, pages: newPages };
        }
        // Handle flat list (thread)
        if (Array.isArray(old)) {
          return old.map((msg) =>
            msg.id === tempId
              ? { ...msg, isPending: false, isError: true }
              : msg
          );
        }
        return old;
      };

      if (!parentId) {
        queryClient.setQueryData(['messages', channelId], updateMessageAsError);
      } else {
        queryClient.setQueryData(
          ['messages', channelId, parentId],
          updateMessageAsError
        );
      }
      console.error(err);
    },
    onSuccess: (result, variables, context) => {
      if (result.error) {
        toast.error(result.error);
        // Mark as error if backend returned error
        // Reuse the onError logic or manually update
        // Ideally onError callback handles threw errors.
        // If sendMessage returns { error: ... }, it doesn't throw.
        // I should throw in mutationFn if result.error?
        // In mutationFn: return await sendMessage(...)
        // I should change logic to check result.error and throw?
        // Or handle here.

        // If I don't throw, onError is not called.
        // So I must handle it here.

        const { tempId } = context || {};
        if (tempId) {
          const updateMessageAsError = (old: any) => {
            if (!old) return old;
            if (old.pages) {
              return {
                ...old,
                pages: old.pages.map((p: any[]) =>
                  p.map((m: any) =>
                    m.id === tempId
                      ? { ...m, isPending: false, isError: true }
                      : m
                  )
                ),
              };
            }
            if (Array.isArray(old)) {
              return old.map((m: any) =>
                m.id === tempId ? { ...m, isPending: false, isError: true } : m
              );
            }
            return old;
          };
          if (!parentId)
            queryClient.setQueryData(
              ['messages', channelId],
              updateMessageAsError
            );
          else
            queryClient.setQueryData(
              ['messages', channelId, parentId],
              updateMessageAsError
            );
        }

        return;
      }

      if (result.scheduled) {
        toast.success('Message scheduled');
        // If scheduled, we might want to remove the optimistic message?
        // Logic says "Don't optimistically update scheduled" in onMutate.
        // So no temp message to remove.
      } else {
        // Replace optimistic message with real one
        if (!parentId) {
          queryClient.setQueryData(['messages', channelId], (old: any) => {
            if (!old || !old.pages) return old;
            const newPages = old.pages.map((page: any[]) =>
              page.map((msg: any) =>
                msg.id === context?.tempId ? result.message : msg
              )
            );
            return { ...old, pages: newPages };
          });
        } else {
          queryClient.setQueryData(
            ['messages', channelId, parentId],
            (old: any) => {
              if (!old) return old;
              return old.map((msg: any) =>
                msg.id === context?.tempId ? result.message : msg
              );
            }
          );
        }
      }
    },
  });
}
