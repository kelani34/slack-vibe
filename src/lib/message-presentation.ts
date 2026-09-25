import { differenceInMinutes } from 'date-fns';
import type { Message } from '@prisma/client';

type AvatarMessage = Pick<Message, 'userId' | 'createdAt'>;

export function shouldShowAvatar(
  currentMessage: AvatarMessage,
  previousMessage?: AvatarMessage,
): boolean {
  if (!previousMessage || currentMessage.userId !== previousMessage.userId) {
    return true;
  }

  return differenceInMinutes(currentMessage.createdAt, previousMessage.createdAt) >= 5;
}
