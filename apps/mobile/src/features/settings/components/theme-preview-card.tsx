import { StyleSheet, Pressable, View } from 'react-native';
import { EaseView } from 'react-native-ease/uniwind';
import { AppText } from '@/src/components/shared/app-text';
import type { ThemeEntry } from '@/src/lib/themes';

type Props = {
  theme: ThemeEntry;
  isActive: boolean;
  onPress: () => void;
  /** Overrides the default lock (premium + no CSS yet), e.g. premium && !isPlus. */
  isLocked?: boolean;
  width?: number;
};

const EASE_EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_INITIAL = { opacity: 0 };
const EASE_ANIMATE = { opacity: 1 };
const EASE_TRANSITION = { type: 'timing' as const, duration: 200, easing: EASE_EASING };

/**
 * Mini preview card showing a snapshot of the reflect idle screen.
 * Uses theme.preview hex colors as inline styles — no CSS variable
 * resolution needed, works regardless of the active global theme.
 *
 * Active: accent ring + "Active" micro-label.
 * Premium/unavailable: lock glyph overlay; tap is handled by parent.
 */
export const ThemePreviewCard = ({
  theme,
  isActive,
  onPress,
  isLocked: lockedOverride,
  width = 130,
}: Props) => {
  const { preview } = theme;
  const isLocked =
    lockedOverride ?? (theme.tier === 'premium' && theme.available === false);

  const outerRingStyle = {
    borderRadius: 16,
    padding: isActive ? 2 : 0,
    borderWidth: isActive ? 1.5 : 0,
    borderColor: isActive ? preview.accent : 'transparent',
  };
  const cardBodyStyle = {
    backgroundColor: preview.bg,
    borderRadius: isActive ? 14 : 16,
    overflow: 'hidden' as const,
    minHeight: 140,
    padding: 14,
  };
  const encouragementStyle = {
    fontSize: 9,
    fontStyle: 'italic' as const,
    color: preview.fg + '50',
    marginBottom: 8,
  };
  const separatorStyle = {
    height: 0.5,
    backgroundColor: preview.border,
    marginBottom: 8,
  };
  const headlineStyle = {
    fontSize: 12,
    fontWeight: '600' as const,
    color: preview.fg,
    lineHeight: 17,
    marginBottom: 12,
  };
  const chipStyle = {
    alignSelf: 'flex-start' as const,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: preview.accent + '60',
    backgroundColor: preview.accent + '18',
    paddingHorizontal: 8,
    paddingVertical: 3,
  };
  const chipLabelStyle = { fontSize: 9, color: preview.accent, fontWeight: '500' as const };
  const accentDotStyle = {
    position: 'absolute' as const,
    bottom: 10,
    right: 10,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: preview.accent + '80',
  };
  const lockOverlayStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: preview.bg + 'cc',
    borderRadius: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
  const activeLabelStyle = { fontSize: 9, color: preview.accent };

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { width }]}
      accessibilityRole="button"
      accessibilityLabel={`${theme.name} theme${isActive ? ', active' : ''}`}
    >
      {/* Outer ring — only visible when active */}
      <View style={outerRingStyle}>
        {/* Card body */}
        <View style={cardBodyStyle}>
          {/* Encouragement line */}
          <AppText style={encouragementStyle}>
            {"What's here right now..."}
          </AppText>

          {/* Faux separator */}
          <View style={separatorStyle} />

          {/* Headline */}
          <AppText style={headlineStyle}>
            {"What's here\nright now?"}
          </AppText>

          {/* Texture chip */}
          <View style={chipStyle}>
            <AppText style={chipLabelStyle}>
              heavy
            </AppText>
          </View>

          {/* Accent dot bottom-right */}
          <View style={accentDotStyle} />

          {/* Lock overlay for premium */}
          {isLocked && (
            <View style={lockOverlayStyle}>
              <AppText style={styles.lockIcon}>🔒</AppText>
            </View>
          )}
        </View>
      </View>

      {/* Label row */}
      <View style={styles.labelRow}>
        <AppText className="text-xs text-foreground/70">{theme.name}</AppText>
        {isActive && (
          <EaseView
            initialAnimate={EASE_INITIAL}
            animate={EASE_ANIMATE}
            transition={EASE_TRANSITION}
          >
            <AppText style={activeLabelStyle}>
              · Active
            </AppText>
          </EaseView>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {},
  labelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  lockIcon: { fontSize: 18 },
});
