import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface ChannelMembersQueryStateProps {
  isError: boolean;
  hasData: boolean;
  subject: string;
  onRetry: () => void;
  children: ReactNode;
}

export function ChannelMembersQueryState({
  isError,
  hasData,
  subject,
  onRetry,
  children,
}: ChannelMembersQueryStateProps) {
  if (isError && !hasData) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 py-2">
        <p className="text-sm text-muted-foreground">Couldn’t load {subject}.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <>
      {isError && (
        <div role="alert" className="mb-2 flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>Couldn’t refresh {subject}.</span>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
      {children}
    </>
  );
}
