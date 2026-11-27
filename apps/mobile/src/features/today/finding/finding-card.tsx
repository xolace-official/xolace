import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Card } from "@/components/shared/card";
import { PressScale } from "@/components/shared/press-scale";
import { playSoftPress } from "@/lib/haptics";
import { COPY } from "../copy";
import { useToday } from "../today-data";
import { type FindingPicks, findingAnswer, findingStep } from "./finding-model";

const FADE_MS = 320;
const THANKS_MS = 2400;

export function FindingCard() {
	const { state, actions } = useToday();
	const [showing, setShowing] = useState(false);
	const [thanked, setThanked] = useState(false);
	const [picks, setPicks] = useState<FindingPicks>({});

	if (!(showing || thanked) && state.findingDue) {
		setShowing(true);
	}

	useEffect(() => {
		if (!thanked) {
			return;
		}
		const timer = setTimeout(() => setShowing(false), THANKS_MS);
		return () => clearTimeout(timer);
	}, [thanked]);

	if (!showing) {
		return null;
	}
	const step = findingStep(picks);

	const choose = (value: string) => {
		playSoftPress();
		const next = step.pick(picks, value);
		const answer = findingAnswer(next);
		setPicks(next);
		if (answer) {
			setThanked(true);
			actions.answerFinding(answer);
		}
	};

	const notNow = () => {
		actions.dismissFinding();
		setShowing(false);
	};
	const back = () => setPicks({});
	const aside = step.dismissible
		? { label: COPY.finding.notNow, onPress: notNow }
		: { label: COPY.finding.back, onPress: back };

	return (
		<Animated.View
			entering={FadeIn.duration(FADE_MS)}
			exiting={FadeOut.duration(FADE_MS)}
		>
			<Card className="gap-3 px-5 py-5">
				{thanked ? (
					<AppText
						accessibilityLiveRegion="polite"
						variant="body"
						weight="medium"
					>
						{COPY.finding.thanks}
					</AppText>
				) : (
					<>
						<View className="flex-row items-start justify-between gap-3">
							<AppText
								accessibilityRole="header"
								className="flex-1"
								variant="body"
								weight="medium"
							>
								{step.question}
							</AppText>
							<PressScale
								accessibilityLabel={aside.label}
								className="min-h-11 justify-center"
								hitSlop={8}
								onPress={aside.onPress}
							>
								<AppText color="muted" variant="footnote">
									{aside.label}
								</AppText>
							</PressScale>
						</View>
						<View className="flex-row flex-wrap gap-2">
							{step.choices.map(({ label, value }) => (
								<PressScale
									accessibilityLabel={label}
									className="rounded-full border border-separator px-3.5 py-2"
									key={value}
									onPress={() => choose(value)}
								>
									<AppText variant="footnote">{label}</AppText>
								</PressScale>
							))}
						</View>
					</>
				)}
			</Card>
		</Animated.View>
	);
}
