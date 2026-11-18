import { Pressable, useWindowDimensions } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { useTokenColors } from "@/lib/use-token-color";
import { PROMISE } from "../copy";
import {
	CONTROL_MIN_SCALE,
	CONTROLS_BOTTOM,
	controlStack,
} from "../first-run-layout";
import {
	clamp,
	ease,
	easeIO,
	fs,
	lerp,
	mixRGB,
	type Stage,
	seg,
} from "../first-run-motion";
import { css, PROMISE_COLORS } from "../first-run-palette";
import { ageT, ageX, CTA_Y, OPEN, type PEng, X } from "./promise-scene";

/** Board `.cta`: top 702, 28 pt in, 56 tall, a pill; `.acct`: top 766, 36 tall. */
const CTA = { h: 56, side: 28, top: 702 };
const ACCT = { h: 36, top: 766 };
/** The labels' lines and the room around them. */
const CTA_LINE = { line: 22, pad: 20 };
const ACCT_LINE = { line: 19, pad: 12 };
const ACCT_GAP = ACCT.top - (CTA.top + CTA.h);
const COAL = 16;
const RM_FADE_MS = 200;

/**
 * "I'd like that", full width, and the quiet account link. Pressed, it squeezes to .97 on a
 * spring; let go, it turns ember, gathers into a 16 pt coal at (195, 730) and drops into the fire.
 */
export function PromiseButton({
	eng,
	stage,
	day,
	onGo,
}: {
	eng: SharedValue<PEng>;
	stage: Stage;
	day: boolean;
	onGo: (toSeat: boolean) => void;
}) {
	const { fontScale } = useWindowDimensions();
	const [buttonShadow] = useTokenColors(["first-run-button-shadow"]);
	// Both grow down into the room above the home indicator, then their labels shrink to fit.
	const [pill, link] = controlStack(
		CTA.top,
		ACCT_GAP,
		CONTROLS_BOTTOM,
		[
			{ h: CTA.h, ...CTA_LINE },
			{ h: ACCT.h, ...ACCT_LINE },
		],
		fontScale
	);
	const base = day ? PROMISE_COLORS.ink.day : PROMISE_COLORS.ink.dusk;
	const ember = PROMISE_COLORS.fireEmber;
	const cta = useAnimatedStyle(() => {
		const e = eng.get();
		const t = ageT(e);
		const x = ageX(e);
		const rest = {
			borderRadius: pill.h / 2,
			height: pill.h,
			left: CTA.side,
			right: CTA.side,
			top: pill.top + stage.dy,
		};
		if (x < 0) {
			const p = e.rm
				? clamp(t / RM_FADE_MS)
				: ease(seg(t, OPEN.cta, OPEN.cta + 400));
			const y = e.rm ? 0 : 16 * (1 - fs((t - OPEN.cta) / 1000, 10.95, 0.913));
			return {
				...rest,
				backgroundColor: css(base),
				opacity: p,
				shadowOpacity: 0,
				transform: [{ translateY: y }, { scale: 1 - 0.03 * e.sq }],
			};
		}
		if (e.rm) {
			return {
				...rest,
				backgroundColor: css(base),
				opacity: 1 - clamp(x / RM_FADE_MS),
				shadowOpacity: 0,
				transform: [{ translateY: 0 }, { scale: 1 }],
			};
		}
		const am = ease(seg(x, 0, X.amber));
		const k = easeIO(seg(x, X.collapse[0], X.collapse[1]));
		const side = lerp(CTA.side, stage.W / 2 - COAL / 2, k);
		const h = lerp(pill.h, COAL, k);
		return {
			backgroundColor: css(mixRGB(base, ember, am)),
			borderRadius: h / 2,
			height: h,
			left: side,
			opacity: 1 - seg(x, 380, 440),
			right: side,
			shadowOpacity: 0.55 * am,
			shadowRadius: 15 * am,
			top: lerp(pill.top, CTA_Y - COAL / 2, k) + stage.dy,
			transform: [{ translateY: 0 }, { scale: 1 }],
		};
	});
	const label = useAnimatedStyle(() => {
		const x = ageX(eng.get());
		return { opacity: x < 0 ? 1 : 1 - seg(x, 40, 160) };
	});
	const acct = useAnimatedStyle(() => {
		const e = eng.get();
		const t = ageT(e);
		const x = ageX(e);
		const shown = e.rm
			? clamp(t / RM_FADE_MS)
			: ease(seg(t, OPEN.acct, OPEN.acct + 400));
		return { opacity: shown * (x >= 0 ? 1 - clamp(x / 160) : 1) };
	});
	const press = (down: boolean) =>
		eng.modify((e) => {
			"worklet";
			if (e.tx < 0) {
				e.down = down;
			}
			return e;
		});

	return (
		<>
			<Animated.View
				className="absolute"
				style={[
					{
						shadowColor: buttonShadow,
						shadowOffset: { height: 0, width: 0 },
					},
					cta,
				]}
			>
				<Pressable
					accessibilityLabel={PROMISE.cta}
					accessibilityRole="button"
					className="flex-1 items-center justify-center px-4"
					onPress={() => onGo(false)}
					onPressIn={() => press(true)}
					onPressOut={() => press(false)}
				>
					<Animated.View style={label}>
						<AppText
							adjustsFontSizeToFit
							maxFontSizeMultiplier={pill.max}
							minimumFontScale={CONTROL_MIN_SCALE}
							numberOfLines={1}
							style={{
								color: css(
									day ? PROMISE_COLORS.label.day : PROMISE_COLORS.label.dusk
								),
								fontSize: 17,
								lineHeight: 22,
							}}
							weight="semibold"
						>
							{PROMISE.cta}
						</AppText>
					</Animated.View>
				</Pressable>
			</Animated.View>
			<Animated.View
				className="absolute inset-x-0"
				style={[{ height: link.h, top: link.top + stage.dy }, acct]}
			>
				<Pressable
					accessibilityRole="button"
					className="flex-1 items-center justify-center px-7"
					onPress={() => onGo(true)}
				>
					<AppText
						adjustsFontSizeToFit
						maxFontSizeMultiplier={link.max}
						minimumFontScale={CONTROL_MIN_SCALE}
						numberOfLines={1}
						style={{
							color: css(
								day ? PROMISE_COLORS.ink2.day : PROMISE_COLORS.ink2.dusk
							),
							fontSize: 14.5,
							lineHeight: 19,
						}}
						weight="medium"
					>
						{PROMISE.haveAccount}
					</AppText>
				</Pressable>
			</Animated.View>
		</>
	);
}
