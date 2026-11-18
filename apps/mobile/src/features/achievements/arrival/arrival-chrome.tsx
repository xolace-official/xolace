import { useState } from "react";
import Animated, {
	type SharedValue,
	useAnimatedReaction,
	useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import { GlassGroup } from "@/components/shared/glass-group";
import { Icon, type IconName } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import {
	age,
	type Eng,
	PH,
	RV,
	shutAt,
	T,
} from "@/features/achievements/arrival/arrival-motion";
import { COPY } from "@/features/achievements/copy";
import { clamp, easeOut, seg } from "@/features/achievements/motion-math";
import { useTokenColor } from "@/lib/use-token-color";

export const CTA_H = 52;
const CLOSE_TOP = 56;
const CTA_RISE = 40;
const CTA_IN_MS = 450;
/** The badge's CTA keeps the milestone's for this long after Next, fading as it hands over. */
const HANDOFF_MS = 400;
const CLOSE_FADE = { from: 200, to: 500 } as const;
const REDUCED_FADE_MS = 200;
const XMARK: IconName = { android: "close", ios: "xmark" };
const XMARK_SIZE = 15;

/** Next / Lovely at the foot, and the close top right (arrivals §2). */
export function ArrivalChrome({
	eng,
	first,
	total,
	dark,
	top,
	onCta,
	onClose,
}: {
	eng: SharedValue<Eng>;
	first: Eng;
	total: number;
	dark: boolean;
	/** The status bar's shift from the board. */
	top: number;
	onCta: () => void;
	onClose: () => void;
}) {
	const insets = useSafeAreaInsets();
	const foreground = useTokenColor("foreground");
	const ctaBg = useTokenColor(dark ? "arrival-cta-dusk" : "foreground");
	const ctaInk = useTokenColor(dark ? "arrival-cta-ink-dusk" : "on-art");
	const ctaStyle = useAnimatedStyle(() => {
		const e = eng.get();
		if (e.phase === PH.ms) {
			const p = e.rm ? 1 : easeOut(seg(age(e, e.tm), T.cta, T.cta + CTA_IN_MS));
			return { opacity: p, transform: [{ translateY: CTA_RISE * (1 - p) }] };
		}
		const a = age(e, e.ta);
		const p = e.rm
			? clamp(a / REDUCED_FADE_MS)
			: easeOut(seg(a, RV.cta, RV.cta + CTA_IN_MS));
		const o = age(e, e.to);
		const handing = o >= 0 && o < HANDOFF_MS;
		return {
			opacity: Math.max(p, handing ? 1 - o / HANDOFF_MS : 0) * shutAt(e),
			transform: [{ translateY: e.rm || handing ? 0 : CTA_RISE * (1 - p) }],
		};
	});
	const closeStyle = useAnimatedStyle(() => {
		const e = eng.get();
		if (e.phase === PH.ms) {
			return {
				opacity: e.rm
					? 1
					: easeOut(seg(age(e, e.tm), CLOSE_FADE.from, CLOSE_FADE.to)),
			};
		}
		return { opacity: shutAt(e) };
	});
	return (
		<>
			<Animated.View
				className="absolute inset-x-6"
				style={[{ bottom: insets.bottom, height: CTA_H }, ctaStyle]}
			>
				<PressScale
					className="items-center justify-center"
					onPress={onCta}
					style={{
						backgroundColor: ctaBg,
						borderRadius: CTA_H / 2,
						height: CTA_H,
					}}
				>
					<CtaLabel color={ctaInk} eng={eng} first={first} total={total} />
				</PressScale>
			</Animated.View>
			<Animated.View
				className="absolute right-4"
				style={[{ top: CLOSE_TOP + top }, closeStyle]}
			>
				<GlassGroup className="p-0">
					<PressScale
						accessibilityLabel={COPY.arrival.close}
						className="size-11 items-center justify-center"
						onPress={onClose}
					>
						<Icon
							color={foreground}
							name={XMARK}
							size={XMARK_SIZE}
							weight="semibold"
						/>
					</PressScale>
				</GlassGroup>
			</Animated.View>
		</>
	);
}

/** "Next" while something follows, then "Lovely": a small render of the label only. */
function CtaLabel({
	eng,
	total,
	first,
	color,
}: {
	eng: SharedValue<Eng>;
	total: number;
	first: Eng;
	color: string;
}) {
	const [more, setMore] = useState(
		first.phase === PH.ms || first.step < total - 1
	);
	useAnimatedReaction(
		() => {
			const e = eng.get();
			return e.phase === PH.ms || e.step < total - 1;
		},
		(v, was) => {
			if (was !== null && v !== was) {
				scheduleOnRN(setMore, v);
			}
		}
	);
	return (
		<AppText
			className="text-[17px] leading-[22px]"
			style={{ color }}
			variant="body"
			weight="semibold"
		>
			{more ? COPY.arrival.next : COPY.arrival.lovely}
		</AppText>
	);
}
