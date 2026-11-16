import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Card, SectionHeader } from "@/components/shared/card";
import { PressScale } from "@/components/shared/press-scale";
import type { DevState } from "@/dev/dev-state";
import { DEV_FEATURES } from "@/dev/discovered";
import { cn } from "@/lib/cn";

function StateRow({
	feature,
	state,
	last,
}: {
	feature: string;
	state: DevState;
	last: boolean;
}) {
	return (
		<PressScale
			accessibilityHint={`Opens ${feature}'s screen on fixtures`}
			accessibilityRole="link"
			className={cn("gap-0.5 px-4 py-3", !last && "border-separator border-b")}
			onPress={() =>
				router.push({
					params: { feature, state: state.id },
					pathname: "/dev/[feature]/[state]",
				})
			}
		>
			<AppText variant="body">{state.title}</AppText>
			<AppText color="muted" variant="footnote">
				xolace://dev/{feature}/{state.id}
			</AppText>
		</PressScale>
	);
}

/**
 * Dev tools › Dev states: every registered state, by feature.
 * @public Opened by its route shim's `__DEV__` require, which knip can't follow.
 */
export function DevIndexScreen() {
	return (
		<ScrollView
			contentContainerClassName="gap-module px-gutter pt-2 pb-16"
			contentInsetAdjustmentBehavior="automatic"
		>
			<AppText color="muted" variant="callout">
				Each screen state on fixtures, no backend needed. Open one by link to
				screenshot it.
			</AppText>
			{DEV_FEATURES.length === 0 && (
				<AppText variant="body">
					No states yet: add a feature's dev/states.tsx.
				</AppText>
			)}
			{DEV_FEATURES.map(({ feature, states }) => (
				<View className="gap-2" key={feature}>
					<SectionHeader title={feature} />
					<Card flat>
						{states.map((state, i) => (
							<StateRow
								feature={feature}
								key={state.id}
								last={i === states.length - 1}
								state={state}
							/>
						))}
					</Card>
				</View>
			))}
		</ScrollView>
	);
}
