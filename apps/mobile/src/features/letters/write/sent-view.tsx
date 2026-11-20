import { router } from "expo-router";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { useFixedFaces } from "@/design/fonts";
import { FONTS } from "@/design/type";
import { LETTERS } from "../copy";
import { Fade } from "../fade";
import { LETTER_MOTION } from "../letter-motion";
import { backToLetters } from "../letters-routes";

const L = LETTER_MOTION.label;
const TITLE = {
	fontFamily: FONTS.mirror,
	fontSize: 32,
	lineHeight: 38,
} as const;
const TITLE_MAX_SCALE = 1.4;

export function SentView({
	show,
	reduced,
}: {
	show: boolean;
	reduced: boolean;
}) {
	const ready = useFixedFaces("mirror");
	const enter = { delay: L.delayMs, ms: L.ms, on: show, reduced, rise: L.rise };
	return (
		<View
			className="absolute inset-0"
			pointerEvents={show ? "box-none" : "none"}
		>
			<Fade
				{...enter}
				className="absolute top-[36%] right-8 left-8 items-center gap-2.5"
			>
				<AppText
					accessibilityRole="header"
					className="text-center"
					maxFontSizeMultiplier={TITLE_MAX_SCALE}
					style={{ ...TITLE, opacity: ready ? 1 : 0 }}
					variant="title"
				>
					{LETTERS.sent.title}
				</AppText>
				<AppText className="text-center" color="muted" variant="callout">
					{LETTERS.sent.body}
				</AppText>
			</Fade>
			<Fade {...enter} className="absolute right-4 bottom-10 left-4 gap-1">
				<PressScale
					accessibilityRole="button"
					className="min-h-[50px] items-center justify-center rounded-full bg-foreground px-4"
					onPress={backToLetters}
				>
					<AppText color="background" variant="body" weight="semibold">
						{LETTERS.sent.seeLetters}
					</AppText>
				</PressScale>
				<PressScale
					accessibilityRole="button"
					className="min-h-[50px] items-center justify-center"
					onPress={() => router.back()}
				>
					<AppText variant="body" weight="semibold">
						{LETTERS.sent.done}
					</AppText>
				</PressScale>
			</Fade>
		</View>
	);
}
