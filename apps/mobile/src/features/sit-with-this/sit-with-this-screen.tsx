import { useKeepAwake } from "expo-keep-awake";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { useFixedFaces } from "@/design/fonts";
import { COPY } from "./copy";
import type { SitScene } from "./run/sit-run";
import { SitRunView } from "./run/sit-run-view";
import { useSit } from "./sit-data";

/**
 * Sit with this ("Two arcs, one breath", design/handoff/sit.md), opened from a
 * reflection's path or a kindling twig. Beats run on timers without a touch,
 * so the screen stays on throughout. `scene` is for dev states only.
 */
export function SitWithThisScreen({ scene }: { scene?: SitScene }) {
	useKeepAwake();
	const { state, actions } = useSit();
	const facesReady = useFixedFaces("mirror");

	if (state.status === "empty") {
		return (
			<View className="flex-1 items-center justify-center gap-6 bg-background px-8">
				<AppText center color="muted" variant="body">
					{COPY.empty.body}
				</AppText>
				<PressScale
					className="min-h-11 justify-center px-4"
					onPress={() => actions.finish(false)}
				>
					<AppText color="subtle" variant="callout" weight="medium">
						{COPY.empty.back}
					</AppText>
				</PressScale>
			</View>
		);
	}

	if (state.status === "loading" || !state.exercise || !facesReady) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<AppText color="subtle" variant="callout">
					{COPY.loading}
				</AppText>
			</View>
		);
	}

	return (
		<SitRunView
			exercise={state.exercise}
			key={state.exercise.key}
			scene={scene}
		/>
	);
}
