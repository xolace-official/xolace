import type { ComponentProps } from "react";
import { SwitchRow } from "@/components/settings-kit/switch-row";
import { playSoftPress, playTextureSelect } from "@/lib/haptics";

/**
 * A switch another feature composes in through the route (features meet in routes): letters'
 * two. Null while that feature loads: the row reads off and taps wait.
 */
export type ComposedSwitch = { on: boolean; set: (on: boolean) => void } | null;

/**
 * The kit's `SwitchRow` with production's toggle haptics: a texture tick turning on, a soft
 * press turning off. The prototype's kit row plays none, so Settings adds them here rather
 * than in the kit.
 */
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
