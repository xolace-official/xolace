import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Card } from "@/components/shared/card";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { useTokenColor } from "@/lib/use-token-color";
import { PROFILE } from "./copy";
import { useXolacerScreen } from "./xolacer-data";

const CHEVRON = { android: "chevron_right", ios: "chevron.right" } as const;

/** A label beside its sentence (the prototype's facts card). */
function Row({ label, body }: { label: string; body: string }) {
	return (
		<View accessible className="flex-row gap-3">
			<AppText className="w-23.5" variant="callout" weight="semibold">
				{label}
			</AppText>
			<AppText
				className="flex-1 leading-[21px]"
				color="muted"
				variant="callout"
			>
				{body}
			</AppText>
		</View>
	);
}

/** You've talked before, or they're not taking conversations: an accent note. Then the facts
 * in front of you before you ask, with production's full note one tap away. */
export function ProfileFacts() {
	const { state, actions } = useXolacerScreen();
	const muted = useTokenColor("muted");
	if (state.phase !== "ready") {
		return null;
	}
	const { view } = state;
	return (
		<View className="gap-3">
			{view.note ? (
				<View className="gap-1.5 rounded-[22px] border border-accent/25 border-continuous bg-accent-wash p-4">
					<AppText variant="callout" weight="semibold">
						{view.note.title}
					</AppText>
					<AppText color="muted" variant="callout">
						{view.note.body}
					</AppText>
				</View>
			) : null}
			<Card className="gap-3 p-4" flat radius={22}>
				<Row body={PROFILE.who(view.name)} label={PROFILE.whoLabel} />
				<Row body={PROFILE.privacy} label={PROFILE.privacyLabel} />
				<PressScale
					accessibilityLabel={PROFILE.expectA11y}
					className="min-h-9 flex-row items-center gap-1 self-start"
					onPress={actions.openPrimer}
				>
					<AppText color="accentInk" variant="footnote" weight="semibold">
						{PROFILE.expect}
					</AppText>
					<Icon color={muted} name={CHEVRON} size={11} />
				</PressScale>
			</Card>
		</View>
	);
}
