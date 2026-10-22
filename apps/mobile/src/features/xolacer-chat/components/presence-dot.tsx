import { View } from 'react-native';
import { cn } from '@/src/lib/utils';

/**
 * "Here now", as a dot on the corner of an avatar.
 *
 * Decorative on purpose: every surface that renders it already says the same
 * thing in its own accessibility label, and a second announcement on a
 * dot with no text is noise a screen reader can't act on.
 *
 * The ring is `border-surface` because every caller sits on a surface card;
 * without it the dot disappears into a photo of the same colour.
 */
export function PresenceDot({ large = false }: { large?: boolean }) {
  return (
    <View
      className={cn(
        'absolute rounded-full border-2 border-surface bg-success',
        large ? '-bottom-1 -right-1 h-4 w-4' : '-bottom-0.5 -right-0.5 h-3 w-3',
      )}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
