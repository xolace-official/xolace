import { ActivityIndicator, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { useTokenColor } from "@/lib/use-token-color";
import { PLUS } from "../copy";
import { usePlusScreen } from "../plus-data";

/** In place of the plans and the button when the store sold nothing: a dead purchase button
 * fails App Review 2.1. */
export function PlansUnavailable() {
	const { state, actions } = usePlusScreen();
	const fg = useTokenColor("foreground");
	return (
		<View className="items-center gap-1 pb-1">
			<AppText className="text-[15px]" weight="semibold">
				{PLUS.unavailable.title}
			</AppText>
			<AppText center className="text-[13px]" color="muted">
				{PLUS.unavailable.line}
			</AppText>
			<PressScale
				accessibilityLabel={PLUS.unavailable.retry}
				accessibilityState={{ busy: state.retrying }}
				className="mt-2 min-h-11 min-w-32 items-center justify-center rounded-full border border-foreground/20 px-5"
				disabled={state.retrying}
				onPress={actions.retry}
			>
				{state.retrying ? (
					<ActivityIndicator color={fg} size="small" />
				) : (
					<AppText className="text-[15px]" weight="semibold">
						{PLUS.unavailable.retry}
					</AppText>
				)}
			</PressScale>
		</View>
	);
}
