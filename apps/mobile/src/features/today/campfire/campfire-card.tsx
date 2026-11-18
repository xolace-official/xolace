import type { Image as ExpoImage } from "expo-image";
import { useRef } from "react";
import { View } from "react-native";
import { useAnimatedReaction, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import { Card } from "@/components/shared/card";
import { Image } from "@/components/shared/styled";
import { clearOf } from "@/design/clear-of";
import { EaseView } from "@/design/ease";
import { loopOrSettle, useLoopRun } from "@/design/ease-loops";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { useToday } from "../today-data";
import { useOnScreen, useShown, useTodayFrame } from "../today-frame";
import { MODULE_GAP } from "../today-motion";
import { todayRiseProps } from "../today-rise";
import { CampfireEmbers } from "./campfire-embers";
import { campfireLine } from "./campfire-model";
import { RollingCount } from "./rolling-count";

const LOOP = require("@/assets/images/flux/flux-campfire-loop.webp");
const CARD_H = 116;
const RADIUS = 24;
const RISE_SLOT = 1;
const FIRE = { height: 104, width: 78 } as const;
/** campG: the glow breathes over 2.2 s (ember-glow-story's BREATH): opacity .75 → 1, 10 pt right, 1.06. */
const GLOW_MS = 2200;
const GLOW_REST = { opacity: 0.75, scale: 1, translateX: 0 };
const GLOW_UP = { opacity: 1, scale: 1.06, translateX: 10 };

/**
 * Flux by a real fire: warmth breathing along the lower edge, embers rising, this week's
 * campers counted. Inert, as production's cohort card is.
 */
export function CampfireCard() {
	const { state } = useToday();
	const { live, reduced, intro, low } = useTodayFrame();
	// The warmth off its lower edge: fixed firelight, fading out.
	const warmth = useTokenColor("today-campfire-glow");
	const top = useSharedValue(0);
	const onScreen = useOnScreen(top, CARD_H);
	// The glow and the embers are native loops (react-native-ease) that stop off screen.
	const shown = useShown(onScreen);
	const running = live && shown;
	const image = useRef<ExpoImage>(null);

	// The loop plays only while the card is on screen and Today is live. A direct call on
	// the image, not React state, so scrolling past it commits nothing.
	const animate = (on: boolean) => {
		// The native view can be gone by now (a phase change unmounts the card).
		const run = on
			? image.current?.startAnimating()
			: image.current?.stopAnimating();
		run?.catch(() => undefined);
	};
	useAnimatedReaction(
		() => onScreen.get() && live,
		(now, before) => {
			if (now !== before) {
				scheduleOnRN(animate, now);
			}
		}
	);

	const glowRun = useLoopRun(running && !reduced);
	const glow = loopOrSettle({
		from: GLOW_REST,
		periodMs: GLOW_MS,
		reduced,
		running,
		to: GLOW_UP,
	});
	if (!state.campfire) {
		return null;
	}
	const line = campfireLine(state.campfire);
	const link = state.campfire.kind === "stats" ? null : COPY.campfire.link;

	return (
		<EaseView
			{...todayRiseProps(RISE_SLOT, intro, reduced)}
			className="mx-4"
			onLayout={(e) => top.set(e.nativeEvent.layout.y)}
			style={{ marginTop: MODULE_GAP }}
		>
			<Card className="overflow-hidden" radius={RADIUS}>
				<View
					accessibilityLabel={line.label}
					accessibilityRole="text"
					accessible
					className="flex-row items-center gap-3 py-1.5 pr-4 pl-2"
				>
					{/* 230 × 130, 40 left of the card and 66 below it. */}
					<EaseView
						key={glowRun}
						pointerEvents="none"
						{...glow}
						className="absolute -bottom-16.5 -left-10 h-32.5 w-57.5"
						style={{
							backgroundImage: `radial-gradient(closest-side, ${warmth}, ${clearOf(warmth)})`,
						}}
					/>
					<View style={FIRE}>
						<Image
							accessible={false}
							autoplay={!reduced}
							contentFit="contain"
							ref={image}
							source={LOOP}
							style={FIRE}
						/>
						{reduced ? null : <CampfireEmbers low={low} running={running} />}
					</View>
					<View className="flex-1 gap-1 py-3">
						<RollingCount
							play={intro}
							reduced={reduced}
							rest={line.rest}
							tail={line.tail}
							value={line.count}
						/>
						{link ? (
							<AppText
								className="text-[14px]"
								color="accentInk"
								variant="footnote"
								weight="semibold"
							>
								{link}
							</AppText>
						) : null}
					</View>
				</View>
			</Card>
		</EaseView>
	);
}
