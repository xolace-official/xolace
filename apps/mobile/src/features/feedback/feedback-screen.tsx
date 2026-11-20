import { View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackButton } from "@/components/shared/back-button";
import { riseIn } from "@/design/entering";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { FEEDBACK_COPY } from "./copy";
import { useFeedbackScreen } from "./feedback-data";
import { FeedbackMenu } from "./menu/feedback-menu";
import { ReportForm } from "./report/report-form";

const SHEET_TOP = 28;
const SHEET_BOTTOM = 18;
const STEP_RISE = 8;

const STEPS = {
	menu: FeedbackMenu,
	report: ReportForm,
} as const;

export function FeedbackSheet() {
	const { state, actions } = useFeedbackScreen();
	const insets = useSafeAreaInsets();
	const reduced = useEffectiveReducedMotion();
	const Step = STEPS[state.step];
	return (
		<View
			style={{
				paddingBottom: Math.max(insets.bottom, SHEET_BOTTOM),
				paddingTop: state.canGoBack ? SHEET_TOP / 2 : SHEET_TOP,
			}}
		>
			{state.canGoBack ? (
				<BackButton
					className="mb-2 ml-3"
					label={FEEDBACK_COPY.back}
					onPress={actions.back}
				/>
			) : null}
			<Animated.View entering={riseIn(0, reduced, STEP_RISE)} key={state.step}>
				<Step />
			</Animated.View>
		</View>
	);
}
