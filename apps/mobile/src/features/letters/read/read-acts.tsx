import { router } from "expo-router";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { LETTERS } from "../copy";
import { Fade } from "../fade";
import { LETTER_MOTION } from "../letter-motion";

const O = LETTER_MOTION.open;
/** The acts come in with the words, once both thirds have unfolded. */
const AFTER_OPEN = { delay: O.flapMs + O.bottomMs, ms: O.words.ms };
const HIT = 8;

/**
 * Under an open letter: This reached me (or, acknowledged, the line that says so), then Hide or
 * Unhide · Report.
 */
export function ReadActs({
	show,
	reduced,
	acknowledged,
	hidden,
	onAcknowledge,
	onHide,
	onUnhide,
	onReport,
}: {
	show: boolean;
	reduced: boolean;
	acknowledged: boolean;
	hidden: boolean;
	onAcknowledge: () => void;
	onHide: () => void;
	onUnhide: () => void;
	onReport: () => void;
}) {
	const r = LETTERS.read;
	return (
		<Fade
			{...AFTER_OPEN}
			className="mt-[26px] items-center gap-3 px-4"
			on={show}
			reduced={reduced}
		>
			{acknowledged ? (
				<AppText className="px-5 text-center" color="muted" variant="detail">
					{r.acknowledged}
				</AppText>
			) : (
				<PressScale
					accessibilityHint={r.acknowledgeHint}
					accessibilityLabel={r.acknowledge}
					accessibilityRole="button"
					className="min-h-[50px] flex-row items-center gap-2.5 rounded-full border border-separator bg-surface py-2 pr-[22px] pl-3.5"
					onPress={onAcknowledge}
				>
					<View className="size-6 rounded-full border-2 border-ember" />
					<AppText variant="body" weight="semibold">
						{r.acknowledge}
					</AppText>
				</PressScale>
			)}
			<View className="flex-row flex-wrap items-center justify-center gap-2.5">
				<TextButton
					label={hidden ? r.unhide : r.hide}
					onPress={hidden ? onUnhide : onHide}
				/>
				<AppText accessibilityElementsHidden color="muted" variant="detail">
					·
				</AppText>
				<TextButton label={r.report} onPress={onReport} />
			</View>
		</Fade>
	);
}

/** The foot: Letters for you are on · Change in Settings, to Privacy › Receive letters. */
export function ReadFooter({
	show,
	reduced,
}: {
	show: boolean;
	reduced: boolean;
}) {
	return (
		<Fade
			{...AFTER_OPEN}
			className="mt-8 items-center px-6"
			on={show}
			reduced={reduced}
		>
			<PressScale
				accessibilityLabel={LETTERS.read.footerA11y}
				accessibilityRole="link"
				className="min-h-11 justify-center"
				onPress={() => router.push("/settings/data")}
			>
				<AppText className="text-center" color="subtle" variant="footnote">
					{LETTERS.read.footer}
				</AppText>
			</PressScale>
		</Fade>
	);
}

function TextButton({
	label,
	onPress,
}: {
	label: string;
	onPress: () => void;
}) {
	return (
		<PressScale
			accessibilityLabel={label}
			accessibilityRole="button"
			className="min-h-11 justify-center px-1"
			hitSlop={HIT}
			onPress={onPress}
		>
			<AppText color="muted" variant="detail">
				{label}
			</AppText>
		</PressScale>
	);
}
