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

const EVERY_MS = 5000;
const SWAP_MS = 500;
const RISE = 6;
const BLUR = 3;
const SOFT_GLYPHS = 0.35;

const SWAP_A2: CubicBezier = [0.23, 0.138, 0.074, 1.046];
const SWAP_SOFT: CubicBezier = [0.134, 0.999, 0.206, 0.985];
const RISE_EASE: CubicBezier = EASING.easeOut;

type Props = {
	items: readonly string[];
	running: boolean;
	reduced: boolean;
};

export function RotatingPlaceholder({ items, running, reduced }: Props) {
	const subtle = useTokenColor("subtle");
	const [swaps, setSwaps] = useState(0);
	const count = items.length;
	useEffect(() => {
		if (!running || count < 2) {
			return;
		}
		const id = setInterval(() => setSwaps((n) => n + 1), EVERY_MS);
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
	arrive: boolean;
	reduced: boolean;
	ink: string;
};

const SHOWN = { opacity: 1, translateY: 0 };
const HIDDEN = { opacity: 0, translateY: 0 };

function swap(easing: CubicBezier): EaseProps["transition"] {
	const ms = SWAP_MS;
	return {
		opacity: { duration: ms, easing, type: "timing" },
		transform: { duration: ms, easing: RISE_EASE, type: "timing" },
	};
}

function Line({ text, first, up, arrive, reduced, ink }: LineProps) {
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
							duration: SWAP_MS,
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
