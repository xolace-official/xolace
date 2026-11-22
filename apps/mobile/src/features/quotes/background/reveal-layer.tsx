import { useEffect, useEffectEvent, useState } from "react";
import { useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { EASE, T } from "../motion/quote-motion";
import type { QuoteBackground } from "../quotes-model";
import { BackgroundLayer } from "./background-layer";
import { RevealMask } from "./reveal-mask";

/**
 * A picked background growing in over the one drawn. It runs its own reveal and, once grown,
 * opens its clip and stays as it is: the layer under it leaves, this one isn't drawn again.
 */
export function RevealLayer({
	background,
	play,
	reduced,
	width,
	height,
	onRevealed,
}: {
	background: QuoteBackground;
	play: boolean;
	reduced: boolean;
	width: number;
	height: number;
	onRevealed: () => void;
}) {
	const reveal = useSharedValue(0);
	const [open, setOpen] = useState(false);
	const revealed = useEffectEvent(() => {
		setOpen(true);
		onRevealed();
	});

	useEffect(() => {
		reveal.set(
			withTiming(
				1,
				reduced
					? { duration: T.reduced, ...PLAY_AS_CHOSEN }
					: { duration: T.reveal, easing: EASE.reveal, ...PLAY_AS_CHOSEN },
				(fin) => {
					if (fin) {
						scheduleOnRN(revealed);
					}
				}
			)
		);
	}, [reduced, reveal]);

	return (
		<RevealMask
			height={height}
			open={open}
			reduced={reduced}
			reveal={reveal}
			width={width}
		>
			<BackgroundLayer background={background} play={play} />
		</RevealMask>
	);
}
