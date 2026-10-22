import { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAppStore } from '@/src/store/store';
import type { Doc } from '@/convex/_generated/dataModel';

export function useAwarenessEvent(): Doc<'monthlyEvents'> | null {
  const events = useQuery(api.monthlyEvents.getActive);
  const seenEventIds = useAppStore((s) => s.seenEventIds);
  const pruneSeenEventIds = useAppStore((s) => s.pruneSeenEventIds);

  // Prune stale seen entries on mount — NOT during render
  useEffect(() => {
    pruneSeenEventIds();
  }, [pruneSeenEventIds]);

  if (events === undefined) return null; // loading or offline — show nothing

  const today = new Date();
  // en-CA locale produces "YYYY-MM-DD" in local timezone — avoids UTC midnight parse bug
  const todayStr = today.toLocaleDateString('en-CA');

  const active = events
    .filter((e) => e.startDate <= todayStr && todayStr <= e.endDate)
    .filter((e) => !seenEventIds.some((s) => s.slug === e.slug))
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.startDate.localeCompare(b.startDate);
    });

  return active[0] ?? null;
}
