import { useEffect, useRef } from "react";
import {
	BackHandler,
	type TextInstance,
	useWindowDimensions,
	View,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { type SharedValue, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScheme } from "@/design/scheme";
import {
	familyTokens,
	shortDate,
} from "@/features/achievements/achievements-model";
import { isArrivalOpen } from "@/features/achievements/arrival-open";
import { useBadgesScreen } from "@/features/achievements/badges/badges-data";
import {
	geo,
	useBadgeEngine,
} from "@/features/achievements/badges/held/badge-engine";
import { HeldChrome } from "@/features/achievements/badges/held/held-chrome";
import { HeldWords } from "@/features/achievements/badges/held/held-words";
import { Motes } from "@/features/achievements/badges/held/motes";
import { useHeld } from "@/features/achievements/badges/held-store";
import { Coin, GREY_AFTER } from "@/features/achievements/coin/coin";
import { Bloom, Flood } from "@/features/achievements/coin/glow";
import { HELD_R, type Pose } from "@/features/achievements/coin/pose";
import { COPY } from "@/features/achievements/copy";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";

const REACH_PAD = 84;

export function BadgeHeld({ pose }: { pose: SharedValue<Pose> }) {
	const { state, actions } = useBadgesScreen();
	const out = useHeld((s) => s.out);
	const shown = useHeld((s) => s.shown);
	const open = out !== null;
	const badge = shown ? state.view?.byId.get(shown.id) : undefined;
	const insets = useSafeAreaInsets();
	const { width: W, height: H } = useWindowDimensions();
	const reduced = useEffectiveReducedMotion();
	const dark = useScheme() === "dark";
	const titleRef = useRef<TextInstance>(null);
	const { close, turn, gestures, locked } = useBadgeEngine({
		badge,
		open,
		out: shown,
		pose,
		reduced,
		title: titleRef,
		top: insets.top,
		width: W,
	});
	const g = geo(insets.top, W);
	const tokens = familyTokens(badge?.family ?? "night", dark);
	const flood = useTokenColor(locked ? "background" : tokens.flood);
	const glow = useTokenColor(tokens.glow);
	const o = shown?.o ?? { r: 0, x: 0, y: 0 };
	const reach = useSharedValue(0);
	const glowSv = useSharedValue(glow);
	useEffect(() => {
		reach.set(
			Math.hypot(Math.max(o.x, W - o.x), Math.max(o.y, H - o.y)) + REACH_PAD
		);
		glowSv.set(glow);
	}, [o.x, o.y, W, H, glow, reach, glowSv]);

	useEffect(() => {
		if (!open) {
			return;
		}
		const sub = BackHandler.addEventListener("hardwareBackPress", () => {
			if (isArrivalOpen()) {
				return false;
			}
			close();
			return true;
		});
		return () => sub.remove();
	}, [open, close]);

	return (
		<GestureDetector gesture={gestures.pan}>
			<View
				accessibilityElementsHidden={!open}
				accessibilityViewIsModal={open}
				className="absolute inset-0"
				importantForAccessibility={open ? "auto" : "no-hide-descendants"}
				pointerEvents={open ? "auto" : "none"}
			>
				<Flood color={flood} o={o} pose={pose} reach={reach} />
				<Bloom dark={dark} glow={glow} pose={pose} />
				{reduced ? null : (
					<Motes cx={g.hx} cy={g.hy} glow={glowSv} pose={pose} />
				)}
				<HeldWords
					badge={badge}
					dy={g.dy}
					pose={pose}
					reduced={reduced}
					titleRef={titleRef}
					width={W}
				/>
				<GestureDetector gesture={gestures.tap}>
					<View
						accessibilityActions={[
							{ label: COPY.badge.turnOver, name: "turn" },
							{ label: COPY.badge.putBack, name: "putBack" },
						]}
						accessibilityLabel={
							badge ? COPY.badge.image(badge.title, !locked) : undefined
						}
						accessibilityRole="image"
						accessible
						className="absolute"
						onAccessibilityAction={(e) =>
							e.nativeEvent.actionName === "turn" ? turn() : close()
						}
						style={{
							height: HELD_R * 2,
							left: g.hx - HELD_R,
							top: g.hy - HELD_R,
							width: HELD_R * 2,
						}}
					/>
				</GestureDetector>
				{badge ? (
					<Coin
						art={badge.art}
						back={{
							date:
								badge.earnedAt === undefined ? "" : shortDate(badge.earnedAt),
							sparks: badge.sparks,
							title: badge.title,
						}}
						dark={dark}
						greyAfterMs={
							shown?.slot ? GREY_AFTER.onScreen : GREY_AFTER.offScreen
						}
						lit={!(locked || badge.art.unlit)}
						n={shown?.n ?? 0}
						pose={pose}
					/>
				) : null}
				<HeldChrome
					badge={badge}
					dy={g.dy}
					onBack={close}
					onPin={() => badge && actions.togglePin(badge)}
					onShare={() => badge && actions.share(badge)}
					pose={pose}
				/>
			</View>
		</GestureDetector>
	);
}
