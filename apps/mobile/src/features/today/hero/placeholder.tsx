import { useEffect, useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import {
	type CubicBezier,
	EASING,
	type EaseProps,
	EaseView,
	FADE_IN,
	NONE,
} from "@/design/ease";
import { useTokenColor } from "@/lib/use-token-color";
import { TIMING } from "../today-motion";

const RISE = 6;
const BLUR = 3;
/** The soft copy's glyphs under their halo: a 3 pt blur, approximated (the board: ink at 22%, halo at 69%). */
const SOFT_GLYPHS = 0.35;

/*
 * The swap (riseFn over 0.5 s, a = rise(t)): the sharp copy fades in as a², the blurred copy
 * as the bell 2a(1 − a). Ease plays one curve per property, so the bell is two nested views
 * whose opacities each go one way, 2a/(1 + a) × (1 − a²). The curves are fitted beziers
 * (design/review/ease-step4/curve-fits.ts): a² within 1.0% of the travel, 2a/(1 + a) within 0.5%.
 */
const SWAP_A2: CubicBezier = [0.23, 0.138, 0.074, 1.046];
const SWAP_SOFT: CubicBezier = [0.134, 0.999, 0.206, 0.985];
const RISE_EASE: CubicBezier = EASING.easeOut;

type Props = {
	items: readonly string[];
	/** The rotation runs (Today live, the field on screen and empty); stopped, the line holds. */
	running: boolean;
	reduced: boolean;
};

/**
 * The field's placeholder offers a way in every 5 s (rotating-suggestions-input,
 * slowed): the next line comes up 6 pt out of a 3 pt blur over 0.5 s. All lines are laid out
 * once; a JS timer moves to the next line every 5 s (one small render) and the swap plays
 * natively (react-native-ease). Stopping holds the line that's up.
 */
export function RotatingPlaceholder({ items, running, reduced }: Props) {
	const subtle = useTokenColor("subtle");
	// The swaps so far: line `swaps % count` is up. 0 is the first line, shown at rest.
	const [swaps, setSwaps] = useState(0);
	const count = items.length;
	useEffect(() => {
		if (!running || count < 2) {
			return;
		}
		const id = setInterval(
			() => setSwaps((n) => n + 1),
			TIMING.placeholderEvery
		);
		return () => clearInterval(id);
	}, [running, count]);
	return (
		<View>
			{items.map((text, i) => {
				const up = swaps % count === i;
				return (
					<Line
						arrive={up && swaps > 0}
						first={i === 0}
						ink={subtle}
						// A line replays its swap by remounting, once each time it comes up.
						key={up ? `${text}-${swaps}` : text}
						reduced={reduced}
						text={text}
						up={up}
					/>
				);
			})}
		</View>
	);
}

type LineProps = {
	text: string;
	first: boolean;
	up: boolean;
	/** It just came up: play the swap (the very first line shows at rest). */
	arrive: boolean;
	reduced: boolean;
	ink: string;
};

const SHOWN = { opacity: 1, translateY: 0 };
const HIDDEN = { opacity: 0, translateY: 0 };

function swap(easing: CubicBezier): EaseProps["transition"] {
	const ms = TIMING.placeholderSwap;
	return {
		opacity: { duration: ms, easing, type: "timing" },
		transform: { duration: ms, easing: RISE_EASE, type: "timing" },
	};
}

function Line({ text, first, up, arrive, reduced, ink }: LineProps) {
	// Sharp copy. Reduced: a 200 ms fade, no rise and no blurred copy. Hidden: off at once.
	let sharp: EaseProps;
	if (!up) {
		sharp = { animate: HIDDEN, transition: NONE };
	} else if (!arrive) {
		sharp = { animate: SHOWN, transition: NONE };
	} else if (reduced) {
		sharp = FADE_IN;
	} else {
		sharp = {
			animate: SHOWN,
			initialAnimate: { opacity: 0, translateY: RISE },
			transition: swap(SWAP_A2),
		};
	}
	const soft = up && arrive && !reduced;
	const size = "text-[16.5px]";
	return (
		<View
			accessibilityElementsHidden={!first}
			className={first ? undefined : "absolute inset-x-0 top-0"}
			importantForAccessibility={first ? "auto" : "no-hide-descendants"}
		>
			<EaseView {...sharp}>
				<AppText
					className={size}
					color="subtle"
					numberOfLines={1}
					variant="subhead"
				>
					{text}
				</AppText>
			</EaseView>
			{soft ? (
				<EaseView
					accessibilityElementsHidden
					animate={SHOWN}
					className="absolute inset-x-0 top-0"
					importantForAccessibility="no-hide-descendants"
					initialAnimate={{ opacity: 0, translateY: RISE }}
					transition={swap(SWAP_SOFT)}
				>
					<EaseView
						animate={{ opacity: 0 }}
						initialAnimate={{ opacity: 1 }}
						transition={{
							duration: TIMING.placeholderSwap,
							easing: SWAP_A2,
							type: "timing",
						}}
					>
						<AppText
							className={size}
							numberOfLines={1}
							style={[
								{
									color: ink,
									opacity: SOFT_GLYPHS,
									textShadowColor: ink,
									textShadowRadius: BLUR,
								},
							]}
							variant="subhead"
						>
							{text}
						</AppText>
					</EaseView>
				</EaseView>
			) : null}
		</View>
	);
}
