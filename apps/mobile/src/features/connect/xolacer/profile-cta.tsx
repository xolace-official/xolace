import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { CtaButton } from "@/components/shared/cta-button";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { useTokenColor } from "@/lib/use-token-color";
import { PROFILE } from "./copy";
import { useXolacerScreen } from "./xolacer-data";

const CHEVRON = { android: "chevron_right", ios: "chevron.right" } as const;
const ARROW = { android: "arrow_forward", ios: "arrow.right" } as const;

function RateCard() {
	const { state, actions } = useXolacerScreen();
	const accent = useTokenColor("accent-ink");
	if (state.phase !== "ready" || state.view.rate.kind === "hidden") {
		return null;
	}
	const { rate, name } = state.view;
	if (rate.kind === "rated") {
		return (
			<PressScale
				accessibilityLabel={PROFILE.ratedA11y(rate.stars)}
				className="min-h-9 items-center justify-center"
				onPress={actions.rate}
			>
				<AppText color="muted" variant="footnote">
					{PROFILE.ratedLine(rate.stars)}
				</AppText>
			</PressScale>
		);
	}
	return (
		<PressScale
			accessibilityLabel={PROFILE.rateA11y(name)}
			card
			className="flex-row items-center gap-3 rounded-[22px] border-continuous bg-surface p-3.5"
			onPress={actions.rate}
		>
			<View className="flex-1 gap-0.5">
				<AppText variant="callout" weight="semibold">
					{PROFILE.rateTitle(name)}
				</AppText>
				<AppText color="muted" variant="caption">
					{PROFILE.rateSub}
				</AppText>
			</View>
			<AppText color="accentInk" variant="footnote" weight="semibold">
				{PROFILE.rateAction}
			</AppText>
			<Icon color={accent} name={CHEVRON} size={11} />
		</PressScale>
	);
}

export function ProfileCta() {
	const { state, actions } = useXolacerScreen();
	const accent = useTokenColor("accent-ink");
	if (state.phase !== "ready") {
		return null;
	}
	const { cta } = state.view;
	return (
		<View className="gap-2 pb-safe-or-4">
			<RateCard />
			{cta.kind === "ask" ? (
				<CtaButton
					disabled={state.sending}
					label={cta.label}
					onPress={actions.ask}
				/>
			) : cta.kind === "open" ? (
				<CtaButton label={cta.label} onPress={actions.openChat} />
			) : cta.kind === "self" ? null : (
				<CtaButton disabled label={cta.label} onPress={() => undefined} />
			)}
			{cta.note ? (
				<AppText center color="muted" variant="footnote">
					{cta.note}
				</AppText>
			) : null}
			{state.others ? (
				<PressScale
					accessibilityLabel={PROFILE.otherListenersA11y(state.others)}
					className="min-h-11 flex-row items-center justify-center gap-1.5"
					onPress={actions.others}
				>
					<AppText color="accentInk" variant="footnote" weight="semibold">
						{PROFILE.otherListeners(state.others)}
					</AppText>
					<Icon color={accent} name={ARROW} size={12} />
				</PressScale>
			) : null}
		</View>
	);
}
