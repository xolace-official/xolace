// The view switch as SwiftUI's own segmented picker (Expo UI); liquid glass on iOS 26.
// Android uses Material 3 segmented buttons (`talk-view-switch.tsx`).

import { Host } from "@expo/ui";
import { Picker, Text } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import type { TalkView } from "@xolace/backend/convex/lib/voices";
import { useAppTheme } from "@/context/app-theme-context";
import { playSoftPress } from "@/lib/haptics";
import { VIEW_OPTIONS, type ViewSwitchProps } from "./view-options";

const WIDTH = 280;

export function TalkViewSwitch({ view, onChange }: ViewSwitchProps) {
	const { isDark } = useAppTheme();
	return (
		<Host
			colorScheme={isDark ? "dark" : "light"}
			matchContents={{ vertical: true }}
			style={{ width: WIDTH }}
		>
			<Picker
				modifiers={[pickerStyle("segmented")]}
				onSelectionChange={(v: TalkView) => {
					playSoftPress();
					onChange(v);
				}}
				selection={view}
			>
				{VIEW_OPTIONS.map((o) => (
					<Text key={o.value} modifiers={[tag(o.value)]}>
						{o.label}
					</Text>
				))}
			</Picker>
		</Host>
	);
}
