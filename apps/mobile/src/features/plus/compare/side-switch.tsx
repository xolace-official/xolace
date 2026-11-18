import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { PLUS } from "../copy";

export type Side = "free" | "plus";

const SIDES: readonly Side[] = ["free", "plus"];

/** Free or With Plus: the same week, either way it goes. */
export function SideSwitch({
	side,
	onSide,
}: {
	side: Side;
	onSide: (side: Side) => void;
}) {
	return (
		<View
			accessibilityLabel={PLUS.sidesLabel}
			accessibilityRole="radiogroup"
			className="flex-row rounded-[20px] bg-foreground/8 p-[3px]"
		>
			{SIDES.map((s) => {
				const on = s === side;
				return (
					<PressScale
						accessibilityRole="button"
						accessibilityState={{ selected: on }}
						className={cn(
							"min-h-8 flex-1 items-center justify-center rounded-full px-2",
							on ? "bg-foreground" : "bg-transparent"
						)}
						haptic={Presets.System.selection}
						key={s}
						onPress={() => onSide(s)}
					>
						<AppText
							className="text-[13.5px]"
							color={on ? "background" : "muted"}
							weight="semibold"
						>
							{PLUS.sides[s]}
						</AppText>
					</PressScale>
				);
			})}
		</View>
	);
}
