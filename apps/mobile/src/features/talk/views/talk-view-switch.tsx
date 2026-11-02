// The view switch as Material 3 segmented buttons (Expo UI's Jetpack Compose). iOS uses
// SwiftUI's segmented picker (`talk-view-switch.ios.tsx`).

import { Host } from "@expo/ui";
import {
	SegmentedButton,
	SingleChoiceSegmentedButtonRow,
	Text,
} from "@expo/ui/jetpack-compose";
import { useAppTheme } from "@/context/app-theme-context";
import { playSoftPress } from "@/lib/haptics";
import { VIEW_OPTIONS, type ViewSwitchProps } from "./view-options";

const WIDTH = 300;

export function TalkViewSwitch({ view, onChange }: ViewSwitchProps) {
	const { isDark } = useAppTheme();
	return (
		<Host
			colorScheme={isDark ? "dark" : "light"}
			matchContents={{ vertical: true }}
			style={{ width: WIDTH }}
		>
			<SingleChoiceSegmentedButtonRow>
				{VIEW_OPTIONS.map((o) => (
					<SegmentedButton
						key={o.value}
						onClick={() => {
							playSoftPress();
							onChange(o.value);
						}}
						selected={o.value === view}
					>
						<SegmentedButton.Label>
							<Text>{o.label}</Text>
						</SegmentedButton.Label>
					</SegmentedButton>
				))}
			</SingleChoiceSegmentedButtonRow>
		</Host>
	);
}
