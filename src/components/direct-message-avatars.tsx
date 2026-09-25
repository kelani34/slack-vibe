'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UsersRound } from 'lucide-react';

export type DirectMessageAvatarParticipant = {
  id: string;
  name: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  image: string | null;
};

type DirectMessageAvatarsProps = {
  participants: DirectMessageAvatarParticipant[];
  isGroup: boolean;
  fallbackName: string;
  size: 'sidebar' | 'header' | 'inbox';
};

const sizes = {
  sidebar: { avatar: 'h-5 w-5', fallback: 'text-[10px]' },
  header: { avatar: 'h-7 w-7', fallback: 'text-[10px]' },
  inbox: { avatar: 'h-10 w-10', fallback: '' },
};

function participantName(participant: DirectMessageAvatarParticipant | undefined, fallbackName: string) {
  return participant?.displayName || participant?.name || fallbackName;
}

export function DirectMessageAvatars({
  participants,
  isGroup,
  fallbackName,
  size,
}: DirectMessageAvatarsProps) {
  const stacked = isGroup;
  const visibleParticipants = !stacked
    ? [participants[0]]
    : participants.length >= 2
      ? participants.slice(0, 3)
      : [participants[0], undefined];
  const avatarSize = sizes[size];
  const avatars = visibleParticipants.map((participant, index) => {
    const name = participantName(participant, fallbackName);
    const isGroupMarker = stacked && !participant;

    return (
      <Avatar
        key={participant?.id ?? `fallback-${index}`}
        data-avatar-stack-index={stacked ? index : undefined}
        className={`${avatarSize.avatar}${stacked ? ' border-2 border-background' : ''}`}
        style={stacked ? { zIndex: visibleParticipants.length - index } : undefined}
      >
        <AvatarImage
          src={participant?.avatarUrl || participant?.image || undefined}
          alt=""
        />
        <AvatarFallback className={avatarSize.fallback}>
          {isGroupMarker ? <UsersRound aria-hidden className="h-3 w-3" /> : name.slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  });

  if (!stacked) return avatars[0];

  const accessibleLabel = participants.length >= 2
    ? `${participants.length} participants`
    : participants.length === 1
      ? 'Group conversation with 1 active participant'
      : 'Group conversation with no active participants';

  return (
    <div
      role="img"
      aria-label={accessibleLabel}
      className="dm-avatar-stack isolate flex shrink-0 -space-x-2"
    >
      {avatars}
    </div>
  );
}
