import { Skeleton } from '@/components/ui/skeleton';

export function ChannelMembersSkeleton() {
  return (
    <div role="status" aria-label="Loading channel members" className="space-y-2 py-2">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} aria-hidden="true" className="flex items-center gap-3 p-2">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="size-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}
