import FilterList from "@expo/material-symbols/filter_list.xml";
import { Stack } from "expo-router";
import { COPY, type Family } from "@/features/explore/copy";

const OPTIONS: readonly { value: Family; icon: "waveform" | "music.note" }[] = [
	{ icon: "waveform", value: "support" },
	{ icon: "music.note", value: "music" },
];

/**
 * Production's filter menu in the bar: "Family", Support audio and Music, the current one
 * ticked. The system draws it; SF Symbols are iOS-only, Android drops them.
 */
export function FamilyMenu({
	value,
	onChange,
}: {
	value: Family;
	onChange: (f: Family) => void;
}) {
	return (
		<Stack.Toolbar placement="right">
			<Stack.Toolbar.Menu
				accessibilityLabel={COPY.menu}
				icon={
					process.env.EXPO_OS === "ios"
						? "line.3.horizontal.decrease"
						: FilterList
				}
			>
				<Stack.Toolbar.Menu inline title={COPY.menu}>
					{OPTIONS.map((o) => (
						<Stack.Toolbar.MenuAction
							icon={o.icon}
							isOn={value === o.value}
							key={o.value}
							onPress={() => onChange(o.value)}
						>
							{COPY.family[o.value]}
						</Stack.Toolbar.MenuAction>
					))}
				</Stack.Toolbar.Menu>
			</Stack.Toolbar.Menu>
		</Stack.Toolbar>
	);
}
