import { View } from 'react-native';
import { AppText } from '@/src/components/shared/app-text';
import { SETUP_STEPS, completedCount, type SetupDraft } from './steps';

/**
 * The label names the missing field rather than just counting, so nobody has
 * to scan the form to find what's blocking Publish.
 */
export function SetupProgress({
  draft,
  blockingLabel,
}: {
  draft: SetupDraft;
  blockingLabel?: string;
}) {
  const done = completedCount(draft);
  const total = SETUP_STEPS.length;

  return (
    <View className="gap-1.5">
      <View className="h-1.5 overflow-hidden rounded-full bg-surface-tertiary">
        <View
          className="h-full rounded-full bg-accent"
          style={{ width: `${Math.round((done / total) * 100)}%` }}
        />
      </View>
      <AppText className="text-[11px] text-muted">
        {blockingLabel
          ? `${done} of ${total} complete — ${blockingLabel} to publish`
          : 'All set - publish when you’re ready'}
      </AppText>
    </View>
  );
}
