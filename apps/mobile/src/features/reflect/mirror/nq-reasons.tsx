import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { COPY } from "../copy";
import { useReflect } from "../reflect-data";

export function NqReasons() {
	const { state, actions } = useReflect();
	return (
		<View className="flex-row flex-wrap gap-2">
			{COPY.notQuite.reasons.map((r) => {
				const on = state.nqReason === r.id;
				return (
					<PressScale
						accessibilityRole="button"
						accessibilityState={{ selected: on }}
						className={cn(
							"h-8.5 justify-center rounded-full border px-3.5",
							on
								? "border-transparent bg-ember-wash"
								: "border-separator bg-surface"
						)}
						haptic={Presets.chirp}
						key={r.id}
						onPress={() => actions.pickReason(r.id)}
					>
						<AppText
							className="text-[14px]"
							color={on ? "emberInk" : "foreground"}
							variant="callout"
							weight="medium"
						>
							{r.label}
						</AppText>
					</PressScale>
				);
			})}
		</View>
	);
}
