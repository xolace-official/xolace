import { useIsFocused } from "expo-router/react-navigation";
import { type ReactNode, useEffect, useRef } from "react";
import { AccessibilityInfo, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { useCantReachXolace } from "@/lib/connection/use-connection";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { AppText } from "./app-text";
import { cantLoadStart, cantLoadStep } from "./loading-model";

const CANT_LOAD = {
	body: "It'll show up on its own once the connection is back.",
	title: "Can't load this right now.",
} as const;

const SPOKEN = `${CANT_LOAD.title} ${CANT_LOAD.body}`;
const ENTER_MS = 260;

/**
 * What a screen draws while its data hasn't arrived: its own placeholder (`children`, a spinner
 * or skeleton) for as long as Xolace can be reached, with no timeout, and `CantLoad` once it
 * can't. Render it only in the not-loaded branch, so data that already arrived keeps showing;
 * when the data lands the screen swaps it out by itself. `null` children: nothing while
 * loading, the message once Xolace can't be reached. Where the placeholder and the content are
 * one tree (parts that draw their own skeletons), wrap both and pass `loaded`, so the parts
 * aren't remounted when the data lands.
 */
export function Loading({
	children,
	className,
	loaded = false,
}: {
	children: ReactNode;
	className?: string;
	loaded?: boolean;
}) {
	const stalled = useLoadingStalled(!loaded);
	const focused = useIsFocused();
	// Kept here, not in the message, which remounts each time the connection drops again.
	const speech = useRef(cantLoadStart);
	useEffect(() => {
		const step = cantLoadStep(speech.current, { focused, stalled });
		speech.current = step.next;
		if (step.announce) {
			AccessibilityInfo.announceForAccessibilityWithOptions(SPOKEN, {
				queue: true,
			});
		}
	}, [focused, stalled]);
	return stalled ? <CantLoad className={className} /> : children;
}

/** The end-of-loading rule on its own, for a part that steps aside rather than showing the message. */
export const useLoadingStalled = (loading: boolean): boolean =>
	useCantReachXolace() && loading;

/** "Can't load this right now." */
function CantLoad({ className }: { className?: string }) {
	const reduced = useEffectiveReducedMotion();
	return (
		// `className` places the message; the inner view is what a screen reader focuses, so its
		// frame hugs the words even when the message is centred in the whole screen.
		<Animated.View
			className={className}
			entering={FadeIn.duration(
				reduced ? REDUCED_FADE_MS : ENTER_MS
			).reduceMotion(PLAY_AS_CHOSEN.reduceMotion)}
		>
			<View
				accessibilityLabel={SPOKEN}
				accessible
				className="items-center gap-1.5 px-10 py-10"
			>
				<AppText center variant="headline">
					{CANT_LOAD.title}
				</AppText>
				<AppText center className="max-w-75" color="muted" variant="callout">
					{CANT_LOAD.body}
				</AppText>
			</View>
		</Animated.View>
	);
}
