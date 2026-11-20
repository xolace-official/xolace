import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { useTokenColor } from "@/lib/use-token-color";
import { useAgeSheetScreen } from "./age-gate-data";
import { AGE } from "./copy";
import { DateOfBirthPicker } from "./date-of-birth-picker";

const LOCK = { android: "lock", ios: "lock.fill" } as const;

/** The sheet's heading: what happened or what's asked, then why, in one line or two. */
export function AgeHeading({ title, body }: { title: string; body: string }) {
	return (
		<>
			<AppText
				accessibilityRole="header"
				className="text-[22px] leading-7"
				weight="bold"
			>
				{title}
			</AppText>
			<AppText className="mt-1.5 text-[15px] text-foreground/68 leading-[21.3px]">
				{body}
			</AppText>
		</>
	);
}

/**
 * The question: the wheel in a well card, the privacy line, then Continue (40% until the wheel
 * has been turned, as production waits for a pick) and a quiet "Prefer not to say".
 */
export function AgeAsk() {
	const { state, actions } = useAgeSheetScreen();
	const muted = useTokenColor("muted");
	const picked = state.dateOfBirth !== null;
	return (
		<View>
			<AgeHeading body={AGE.ask.lead} title={AGE.ask.title} />
			<View className="mt-4.5">
				<DateOfBirthPicker
					onChange={actions.setDateOfBirth}
					value={state.dateOfBirth}
				/>
			</View>
			<View className="mt-3 flex-row items-center justify-center gap-1.5">
				<Icon color={muted} name={LOCK} size={11} />
				<AppText color="muted" variant="footnote">
					{AGE.ask.private[state.surface]}
				</AppText>
			</View>
			<PressScale
				accessibilityRole="button"
				accessibilityState={{ busy: state.saving, disabled: !picked }}
				className="mt-5 h-14 items-center justify-center rounded-[28px] bg-foreground"
				disabled={!picked || state.saving}
				onPress={actions.submit}
				style={{ opacity: picked ? 1 : 0.4 }}
			>
				<AppText
					className="text-[17px]"
					color="background"
					variant="subhead"
					weight="semibold"
				>
					{state.saving ? AGE.ask.saving : AGE.ask.cont}
				</AppText>
			</PressScale>
			<Pressable
				accessibilityRole="button"
				className="mt-1 h-12 items-center justify-center"
				disabled={state.saving}
				onPress={actions.decline}
			>
				<AppText color="muted" variant="callout" weight="semibold">
					{AGE.ask.decline}
				</AppText>
			</Pressable>
		</View>
	);
}
