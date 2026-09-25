import { sendMessage } from '@/actions/message';
import { uploadFile } from '@/actions/upload';
import { type InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Attachment, Reaction } from '@prisma/client';

type SendResult = Awaited<ReturnType<typeof sendMessage>>;
type SentMessage = Extract<SendResult, { message: unknown }>['message'];
type UploadedAttachment = Pick<Attachment, 'url' | 'name' | 'type' | 'size'>;
type IndexedUploadedAttachment = UploadedAttachment & { index: number };
type SendMessageInput = {
  html: string;
  files?: File[];
  scheduledAt?: Date;
  clientMutationId?: string;
  uploadedAttachments?: IndexedUploadedAttachment[];
};
type CachedAttachment = Pick<Attachment, 'url' | 'name' | 'type' | 'size'> &
  Partial<Pick<Attachment, 'id' | 'messageId' | 'createdAt'>> & {
    fileObject?: File;
    isUploaded?: boolean;
  };
type CachedMessage = Omit<SentMessage, 'attachments' | 'user'> & {
  attachments: CachedAttachment[];
  user: Pick<SentMessage['user'], 'id' | 'name' | 'avatarUrl' | 'image'>;
  reactions?: Pick<Reaction, 'id' | 'messageId' | 'emoji' | 'userId' | 'createdAt'>[];
  replies?: Array<{ content: string; createdAt: Date; user: { id: string; name: string | null; avatarUrl: string | null } }>;
  _count?: { replies: number };
  isPending?: boolean;
  isError?: boolean;
};
type MessagePages = InfiniteData<CachedMessage[], string | undefined>;

function withMessageStatus(
  message: CachedMessage,
  id: string,
  status: Pick<CachedMessage, 'isPending' | 'isError'>,
): CachedMessage {
  return message.id === id ? { ...message, ...status } : message;
}

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

  function updateMessageStatus(
    tempId: string,
    status: Pick<CachedMessage, 'isPending' | 'isError'>,
  ) {
    if (parentId) {
      queryClient.setQueryData<CachedMessage[]>(
        ['messages', channelId, parentId],
        (old) => old?.map((message) => withMessageStatus(message, tempId, status)),
      );
      return;
    }

    queryClient.setQueryData<MessagePages>(['messages', channelId], (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((page) =>
              page.map((message) => withMessageStatus(message, tempId, status)),
            ),
          }
        : old,
    );
  }

  function storeUploadedAttachment(
    clientMutationId: string,
    index: number,
    attachment: UploadedAttachment,
  ) {
    const update = (message: CachedMessage): CachedMessage =>
      message.clientMutationId !== clientMutationId
        ? message
        : {
            ...message,
            attachments: message.attachments.map((current, currentIndex) =>
              currentIndex === index
                ? { ...current, ...attachment, isUploaded: true }
                : current,
            ),
          };

    if (parentId) {
      queryClient.setQueryData<CachedMessage[]>(
        ['messages', channelId, parentId],
        (old) => old?.map(update),
      );
      return;
    }

    queryClient.setQueryData<MessagePages>(['messages', channelId], (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((page) => page.map(update)),
          }
        : old,
    );
  }

  const mutation = useMutation({
    mutationFn: async ({
      html,
      files = [],
      scheduledAt,
      clientMutationId,
      uploadedAttachments: previouslyUploaded = [],
    }: SendMessageInput) => {
      const uploadedByIndex = new Map(previouslyUploaded.map(({ index, ...attachment }) => [index, attachment]));
      const attachments: UploadedAttachment[] = [];

      for (const [index, file] of files.entries()) {
        const cachedAttachment = uploadedByIndex.get(index);
        if (cachedAttachment) {
          attachments.push(cachedAttachment);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('channelId', channelId);
        const result = await uploadFile(formData);
        if (result.error) throw new Error(result.error);
        if (result.url) {
          const attachment = {
            url: result.url,
            name: result.name,
            type: result.type,
            size: result.size,
          };
          attachments.push(attachment);
          if (clientMutationId) {
            storeUploadedAttachment(clientMutationId, index, attachment);
          }
        }
      }

      const formData = new FormData();
      formData.append('channelId', channelId);
      formData.append('content', html);
      formData.append('attachments', JSON.stringify(attachments));
      if (parentId) formData.append('parentId', parentId);
      if (scheduledAt) formData.append('scheduledAt', scheduledAt.toISOString());
      if (clientMutationId) formData.append('clientMutationId', clientMutationId);

      return sendMessage(formData);
    },
    onMutate: async ({
      html,
      files = [],
      scheduledAt,
      clientMutationId,
      uploadedAttachments: previouslyUploaded = [],
    }: SendMessageInput) => {
      await queryClient.cancelQueries({ queryKey: ['messages', channelId] });
      if (scheduledAt) return {};

      const uploadedByIndex = new Map(previouslyUploaded.map(({ index, ...attachment }) => [index, attachment]));

      const newMessage = {
        id: `temp-${crypto.randomUUID()}`,
        clientMutationId: clientMutationId ?? null,
        content: html,
        channelId,
        userId: currentUser?.id || 'unknown',
        parentId: parentId || null,
        scheduledAt: null,
        isPinned: false,
        isDeleted: false,
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        attachments: files.map((file, index) => {
          const uploaded = uploadedByIndex.get(index);
          return {
            url: uploaded?.url ?? URL.createObjectURL(file),
            name: uploaded?.name ?? file.name,
            type: uploaded?.type ?? file.type,
            size: uploaded?.size ?? file.size,
            fileObject: file,
            ...(uploaded ? { isUploaded: true } : {}),
          };
        }),
        reactions: [],
        replies: [],
        _count: { replies: 0 },
        user: {
          id: currentUser?.id || 'unknown',
          name: currentUser?.name || 'You',
          avatarUrl: currentUser?.image || null,
          image: currentUser?.image || null,
        },
        type: 'REGULAR' as const,
        isPending: true,
      };

      if (!parentId) {
        queryClient.setQueryData<MessagePages>(['messages', channelId], (old) =>
          old?.pages.length
            ? { ...old, pages: [[...old.pages[0], newMessage], ...old.pages.slice(1)] }
            : old,
        );
      } else {
        queryClient.setQueryData<CachedMessage[]>(
          ['messages', channelId, parentId],
          (old) => [...(old || []), newMessage],
        );
        queryClient.setQueryData<MessagePages>(['messages', channelId], (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page) =>
                  page.map((message) =>
                    message.id === parentId
                      ? {
                          ...message,
                          _count: {
                            ...message._count,
                            replies: (message._count?.replies ?? 0) + 1,
                          },
                        }
                      : message,
                  ),
                ),
              }
            : old,
        );
      }

      return { tempId: newMessage.id };
    },
    onError: (error, _variables, context) => {
      if (!context?.tempId) return;
      toast.error('Failed to send message');
      updateMessageStatus(context.tempId, { isPending: false, isError: true });
      console.error(error);
    },
    onSuccess: async (result, _variables, context) => {
      if ('error' in result) {
        toast.error(result.error);
        if (context?.tempId) {
          updateMessageStatus(context.tempId, { isPending: false, isError: true });
        }
        return;
      }

      if (result.scheduled) {
        toast.success('Message scheduled');
        await queryClient.invalidateQueries({
          queryKey: parentId
            ? ['scheduled-messages', channelId, parentId]
            : ['scheduled-messages', channelId],
        });
        return;
      }

      if (!context?.tempId) return;
      if (parentId) {
        queryClient.setQueryData<CachedMessage[]>(
          ['messages', channelId, parentId],
          (old) => {
            if (!old) return old;
            const canonicalAlreadyArrived = old.some((message) => message.id === result.message.id);
            return old.flatMap((message) => {
              if (message.id !== context.tempId) return [message];
              return canonicalAlreadyArrived ? [] : [result.message];
            });
          },
        );
      } else {
        queryClient.setQueryData<MessagePages>(['messages', channelId], (old) => {
          if (!old) return old;
          const canonicalAlreadyArrived = old.pages.some((page) =>
            page.some((message) => message.id === result.message.id),
          );
          return {
            ...old,
            pages: old.pages.map((page) =>
              page.flatMap((message) => {
                if (message.id !== context.tempId) return [message];
                return canonicalAlreadyArrived ? [] : [result.message];
              }),
            ),
          };
        });
      }
    },
  });

  function withClientMutationId(input: SendMessageInput): SendMessageInput {
    return {
      ...input,
      clientMutationId: input.clientMutationId ?? crypto.randomUUID(),
    };
  }

  return {
    ...mutation,
    mutate: (input: SendMessageInput) => mutation.mutate(withClientMutationId(input)),
    mutateAsync: (input: SendMessageInput) => mutation.mutateAsync(withClientMutationId(input)),
  };
}
