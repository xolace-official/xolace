import { useThemeColor } from "heroui-native";
import { type DeepPartial, mergeThemes, type Theme } from "stream-chat-expo";
import { useAppTheme } from "@/context/app-theme-context";

/** Bridges Xolace tokens into Stream's `theme.semantics`. Apply to BOTH `OverlayProvider` and
 * `Chat`: the long-press menu reads the overlay host's own ThemeProvider. */
export function useStreamTheme(): DeepPartial<Theme> {
	const { isDark } = useAppTheme();

	const [
		background,
		foreground,
		surface,
		surfaceSecondary,
		surfaceTertiary,
		overlay,
		muted,
		accent,
		accentForeground,
		border,
		separator,
		danger,
		field,
		fieldPlaceholder,
	] = useThemeColor([
		"background",
		"foreground",
		"surface",
		"surface-secondary",
		"surface-tertiary",
		"overlay",
		"muted",
		"accent",
		"accent-foreground",
		"border",
		"separator",
		"danger",
		"field",
		"field-placeholder",
	]);

	// Stream picks its light/dark base from the system `useColorScheme()`, not the
	// in-app theme, so every token not named below would fall through to the wrong
	// base (unreadable composer text). Resolve the base for our scheme first.
	const base = mergeThemes({ scheme: isDark ? "dark" : "light" });

	return {
		// The reaction picker is the seven curated reactions and nothing else
		// (#345); Stream's "+" opens a second sheet of the same set.
		messageMenu: { reactionPicker: { emojiViewerButton: { display: "none" } } },
		semantics: {
			...base.semantics,

			accentError: danger,
			accentPrimary: accent,

			backgroundCoreApp: background,
			backgroundCoreElevation0: background,
			backgroundCoreElevation1: surface,
			backgroundCoreElevation2: overlay,
			backgroundCoreElevation3: overlay,
			backgroundCoreSurfaceCard: surface,
			backgroundCoreSurfaceDefault: surfaceSecondary,
			backgroundCoreSurfaceStrong: surfaceTertiary,
			backgroundCoreSurfaceSubtle: field,
			backgroundUtilityPressed: surfaceTertiary,
			backgroundUtilitySelected: surfaceTertiary,

			borderCoreDefault: border,
			borderCoreSubtle: separator,
			chatBgAttachmentIncoming: surfaceTertiary,
			chatBgAttachmentOutgoing: accent,

			chatBgIncoming: surfaceSecondary,
			chatBgOutgoing: accent,
			chatTextIncoming: foreground,
			chatTextOutgoing: accentForeground,
			chatTextSystem: muted,
			chatTextTimestamp: muted,
			chatTextUsername: muted,

			// The composer's TextInput reads these two directly, not textPrimary.
			inputTextDefault: foreground,
			inputTextIcon: muted,
			inputTextPlaceholder: fieldPlaceholder,
			textLink: accent,
			textOnAccent: accentForeground,

			textPrimary: foreground,
			textSecondary: muted,
			textTertiary: fieldPlaceholder,
		},
	};
}
