import type { ComponentProps } from "react";
import { SwitchRow } from "@/components/settings-kit/switch-row";
import { playSoftPress, playTextureSelect } from "@/lib/haptics";

export type ComposedSwitch = { on: boolean; set: (on: boolean) => void } | null;

export function SettingsSwitchRow({
	onChange,
	...row
}: ComponentProps<typeof SwitchRow>) {
	return (
		<SwitchRow
			{...row}
			onChange={(on) => {
				if (on) {
					playTextureSelect();
				} else {
					playSoftPress();
				}
				onChange(on);
			}}
		/>
	);
}
