import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Holds the composer's footprint while Stream connects.
 */
export function ComposerPlaceholder() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="border-t border-separator bg-surface px-4 pt-4"
      style={{ paddingBottom: insets.bottom || 16 }}
    >
      <View className="h-11 rounded-3xl border border-border" />
    </View>
  );
}
