import { useTypingIndicator } from '@/hooks/use-typing-indicator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function TypingIndicator({
  channelId,
  currentUser,
}: {
  channelId: string;
  currentUser: { id: string; name: string; avatarUrl?: string };
}) {
  const { typingUsers } = useTypingIndicator(channelId, {
    id: currentUser.id,
    name: currentUser.name,
    avatarUrl: currentUser.avatarUrl,
  });

  if (typingUsers.length === 0) return null;

  return (
    <div className="px-4 pb-1 text-xs text-muted-foreground flex items-center gap-1 min-h-6">
      {typingUsers.length === 1 ? (
        <>
          <Avatar className="size-4">
            <AvatarImage src={typingUsers[0].avatarUrl} />
            <AvatarFallback>
              {typingUsers[0].name.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-bold ml-1">{typingUsers[0].name}</span>
          <span>is typing...</span>
        </>
      ) : typingUsers.length === 2 ? (
        <>
          <Avatar className="size-4">
            <AvatarImage src={typingUsers[0].avatarUrl} />
            <AvatarFallback>
              {typingUsers[0].name.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-bold ml-1">{typingUsers[0].name}</span>
          <span className="mx-1">and</span>
          <Avatar className="size-4">
            <AvatarImage src={typingUsers[1].avatarUrl} />
            <AvatarFallback>
              {typingUsers[1].name.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-bold ml-1">{typingUsers[1].name}</span>
          <span>are typing...</span>
        </>
      ) : (
        <span>Several users are typing...</span>
      )}
    </div>
  );
}
