import { useState } from "react";
import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";
import { PillButton } from "@/src/components/shared/pill-button";

type Props = {
	onBegin: () => void;
};

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const INITIAL_FADE = { opacity: 0 };
const VISIBLE_FADE = { opacity: 1 };
const HIDDEN_FADE = { opacity: 0 };
const SHOW_TRANSITION = {
	duration: 600,
	easing: EASE,
	type: "timing",
} as const;
const HIDE_TRANSITION = {
	duration: 300,
	easing: EASE,
	type: "timing",
} as const;
const BUTTON_TRANSITION = {
	delay: 600,
	duration: 400,
	easing: EASE,
	type: "timing",
} as const;

export function PreRollCard({ onBegin }: Props) {
	const [visible, setVisible] = useState(true);

	const handleBegin = () => {
		setVisible(false);
	};

	return (
		<EaseView
			animate={visible ? VISIBLE_FADE : HIDDEN_FADE}
			className="flex-1 items-center justify-center px-8"
			initialAnimate={INITIAL_FADE}
			onTransitionEnd={({ finished }) => {
				if (finished && !visible) {
					onBegin();
				}
			}}
			transition={visible ? SHOW_TRANSITION : HIDE_TRANSITION}
		>
			<View className="items-center gap-6">
				<AppText className="text-center font-semibold text-2xl text-foreground">
					Sit with this
				</AppText>
				<AppText className="text-center text-base text-foreground/50">
					This takes about 90 seconds.{"\n"}Stay with it.
				</AppText>
				<EaseView
					animate={VISIBLE_FADE}
					initialAnimate={INITIAL_FADE}
					transition={BUTTON_TRANSITION}
				>
					<PillButton label="Begin" onPress={handleBegin} />
				</EaseView>
			</View>
		</EaseView>
	);
}
