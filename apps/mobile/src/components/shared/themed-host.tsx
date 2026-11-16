import { Host } from "@expo/ui";
import type { ComponentProps } from "react";
import { useScheme } from "@/design/scheme";
import { useTokenColor } from "@/lib/use-token-color";

/**
 * Expo UI's `Host` (SwiftUI on iOS, Compose on Android) with the theme passed
 * down. Native views follow the system scheme, which the app's theme and
 * `ScopedTheme` don't change, so they need light or dark said out loud. On
 * Android the theme's accent seeds Material's palette, so Compose controls take
 * the theme's colour; iOS keeps the system tint (there `seedColor` would retint
 * SwiftUI's controls). A `colorScheme` or `seedColor` prop still wins.
 */
export function ThemedHost(props: ComponentProps<typeof Host>) {
	const scheme = useScheme();
	const accent = useTokenColor("accent");
	const seedColor = process.env.EXPO_OS === "android" ? accent : undefined;
	return <Host colorScheme={scheme} seedColor={seedColor} {...props} />;
}
