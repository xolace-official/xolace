import FilterList from "@expo/material-symbols/filter_list.xml";
import { Stack } from "expo-router";

export type FilterOption<T extends string> = {
	value: T;
	label: string;
	icon?: "waveform" | "music.note";
	disabled?: boolean;
};

/** Header-right native filter menu for the Browse lists. SF Symbol icons are iOS-only; Android
 * drops them. */
export function BrowseFilterMenu<T extends string>({
	title,
	value,
	options,
	onChange,
}: {
	title: string;
	value: T;
	options: FilterOption<T>[];
	onChange: (value: T) => void;
}) {
	return (
		<Stack.Toolbar placement="right">
			<Stack.Toolbar.Menu
				accessibilityLabel={title}
				icon={
					process.env.EXPO_OS === "ios"
						? "line.3.horizontal.decrease"
						: FilterList
				}
			>
				<Stack.Toolbar.Menu inline title={title}>
					{options.map((o) => (
						<Stack.Toolbar.MenuAction
							disabled={o.disabled}
							icon={o.icon}
							isOn={value === o.value}
							key={o.value}
							onPress={() => onChange(o.value)}
						>
							{o.label}
						</Stack.Toolbar.MenuAction>
					))}
				</Stack.Toolbar.Menu>
			</Stack.Toolbar.Menu>
		</Stack.Toolbar>
	);
}
