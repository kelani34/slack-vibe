import { Lock } from 'lucide-react';

export function ChannelAccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full text-center p-8 bg-muted/10">
      <div className="bg-muted p-4 rounded-full mb-4">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">
        This channel is for private members only
      </h2>
      <p className="text-muted-foreground max-w-sm">
        You are not a member of this channel. If you believe this is a mistake,
        please contact the channel owner or workspace administrator.
      </p>
    </div>
  );
}
