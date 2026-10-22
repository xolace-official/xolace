import { StyleSheet, View } from 'react-native';
import { useThemeColor } from 'heroui-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { AppText } from '@/src/components/shared/app-text';

const styles = StyleSheet.create({
  icon: { marginTop: 2 },
});

/**
 * One icon-and-sentence line. Shared by the profile's expectation blocks and
 * the primer sheet so the two surfaces stay visually identical — they say
 * related things about the same relationship and should look like it.
 */
export function Fact({
  icon,
  children,
}: {
  icon: SymbolViewProps['name'];
  children: React.ReactNode;
}) {
  const muted = useThemeColor('muted') as string;

  return (
    <View className="flex-row gap-3">
      <SymbolView name={icon} size={15} tintColor={muted} style={styles.icon} />
      <AppText className="flex-1 text-[13px] leading-5 text-foreground/85">{children}</AppText>
    </View>
  );
}
