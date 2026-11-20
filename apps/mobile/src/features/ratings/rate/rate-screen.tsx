import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { EaseView } from "@/design/ease";
import { fadeUpProps } from "@/design/entering";
import { useFixedFaces } from "@/design/fonts";
import { useLive } from "@/lib/motion/clock";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { RATE_COPY as C } from "../copy";
import { useRateScreen } from "../rate-data";
import { SCENE_MOTION as M, useEmber } from "./ember-scene";
import { HearthGlow } from "./hearth-glow";
import { LaurelStars } from "./laurel-stars";
import { CloseButton, RateFooter } from "./rate-parts";
import { ReviewNotes } from "./review-notes";

/** Canvas: the laurel 112 pt from the top of the phone, the notes at 368, the footer 34 up. */
const HERO_TOP = 53;
const NOTES_GAP = 46;
const BOTTOM = 34;
const FOOTER_SIDE = 24;

/**
 * "Help someone find Xolace" (canvas "Ratings Alive", second phone): always the dark ember scene.
 * Rate asks the store's prompt, then the pill turns into Write a review with a thank-you line.
 * "Tell us" opens the feedback sheet; sending a note there closes this screen too.
 */
export function RateScreen() {
	const { state, actions } = useRateScreen();
	const insets = useSafeAreaInsets();
	const reduced = useEffectiveReducedMotion();
	const live = useLive(reduced);
	const ember = useEmber();
	const faces = useFixedFaces("letter", "mirror");
	const rise = (i: number) =>
		fadeUpProps(
			M.rise.delays[i] ?? 0,
			M.rise.ms,
			M.rise.dy,
			reduced,
			M.rise.curve
		);
	const title = { color: ember["rate-ink"] };

	return (
		<View className="flex-1" style={{ backgroundColor: ember["rate-page"] }}>
			<HearthGlow ember={ember} />
			<View
				className="items-center px-7"
				style={{ marginTop: insets.top + HERO_TOP }}
			>
				<LaurelStars ember={ember} reduced={reduced} />
				<EaseView {...rise(0)}>
					<AppText
						accessibilityRole="header"
						center
						className={
							faces
								? "mt-[22px] font-letter text-[34px] leading-[38px] tracking-[-0.3px]"
								: "mt-[22px] text-[34px] leading-[38px] tracking-[-0.3px]"
						}
						style={title}
						variant="title"
					>
						{C.titleBefore}
						<AppText
							className={faces ? "font-mirror" : undefined}
							style={title}
							variant="title"
						>
							{C.titleItalic}
						</AppText>
						{C.titleAfter}
					</AppText>
				</EaseView>
				<EaseView {...rise(1)}>
					<AppText
						center
						className="mt-2.5 max-w-[310px] leading-[23px]"
						style={{ color: ember["rate-body"] }}
						variant="subhead"
					>
						{C.body}
					</AppText>
				</EaseView>
			</View>
			<EaseView {...rise(2)} style={{ marginTop: NOTES_GAP }}>
				<ReviewNotes ember={ember} running={live} />
			</EaseView>
			<View className="flex-1" />
			<EaseView
				{...rise(3)}
				style={{
					marginBottom: Math.max(insets.bottom, BOTTOM),
					marginHorizontal: FOOTER_SIDE,
				}}
			>
				<RateFooter
					ember={ember}
					onRate={actions.rate}
					onTellUs={actions.tellUs}
					onWrite={actions.write}
					rated={state.rated}
					reduced={reduced}
				/>
			</EaseView>
			<CloseButton ember={ember} onPress={actions.close} top={insets.top} />
		</View>
	);
}
