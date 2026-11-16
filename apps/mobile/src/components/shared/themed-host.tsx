import { Host } from "@expo/ui";
import type { ComponentProps } from "react";
import { useScheme } from "@/design/scheme";

/**
 * Expo UI's `Host` (SwiftUI on iOS, Compose on Android) with the theme's light or
 * dark passed down. Native views follow the system scheme, which the app's theme
 * and `ScopedTheme` don't change, so they need it said out loud. A `colorScheme`
 * prop still wins.
 */
export function ThemedHost(props: ComponentProps<typeof Host>) {
	const scheme = useScheme();
	return <Host colorScheme={scheme} {...props} />;
}
