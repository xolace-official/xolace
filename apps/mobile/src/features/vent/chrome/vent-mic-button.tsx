import { useState } from "react";
import { Pressable, View } from "react-native";
import { Icon } from "@/components/shared/icon";
import {
	EASING,
	type EaseProps,
	EaseView,
	NONE,
	REDUCED,
	type TimingTransition,
} from "@/design/ease";
import { VENT_COPY } from "@/features/vent/copy";
import { useTokenColor } from "@/lib/use-token-color";

const PULSE = { hi: 0.7, lo: 0.15, ms: 1000 } as const;
/** v2, Reduce Motion: the ring holds still, halfway. */
const REDUCED_RING = 0.45;
const REC_MS = 250;
const REC_SCALE = 1.12;
const MIC = { android: "mic", ios: "mic.fill" } as const;
const STOP = { android: "stop", ios: "stop.fill" } as const;

const REC_TIMING: TimingTransition = {
	duration: REC_MS,
	easing: EASING.inOutQuad,
	type: "timing",
};
const HALF: TimingTransition = {
	duration: PULSE.ms,
	easing: EASING.inOutQuad,
	type: "timing",
};

/**
 * The ring as Ease props. Idle it pulses .15 ↔ .7 (a native loop); listening it goes to full and
 * 1.12 in 250 ms, the colour snapping. After listening it first eases back to .7 (`lead`), as
 * production's Reanimated loop did from wherever it was, then remounts on the loop (Ease loops
 * only what a view mounts with). Reduced: it holds .45.
 */
function ringProps(
	recording: boolean,
	reduced: boolean,
	lead: boolean,
	ink: { ash: string; ember: string }
): EaseProps {
	const IDLE = { backgroundColor: ink.ash, scale: 1 };
	const REC = { backgroundColor: ink.ember, opacity: 1, scale: REC_SCALE };
	if (recording) {
		return {
			animate: REC,
			transition: reduced
				? { default: NONE, opacity: REDUCED }
				: { backgroundColor: NONE, opacity: REC_TIMING, transform: REC_TIMING },
		};
	}
	if (reduced) {
		return {
			animate: { ...IDLE, opacity: REDUCED_RING },
			transition: { default: NONE, opacity: REDUCED },
		};
	}
	if (lead) {
		return {
			animate: { ...IDLE, opacity: PULSE.hi },
			transition: {
				backgroundColor: NONE,
				opacity: HALF,
				transform: REC_TIMING,
			},
		};
	}
	return {
		animate: { ...IDLE, opacity: PULSE.hi },
		initialAnimate: { ...IDLE, opacity: PULSE.lo },
		transition: { ...HALF, loop: "reverse" },
	};
}

type Props = { recording: boolean; reduced: boolean; onPress: () => void };

/**
 * Production's mic button: an ash disc behind a hole in the page colour, read as a 2 pt ring
 * pulsing; while it listens the ring goes amber at full opacity and 1.12, and the icon becomes
 * the stop square. The disc is 60 pt, the hole 56, the button inside it 52 at white 5%.
 * v2: VoiceOver says "Let it go".
 */
export function VentMicButton({ recording, reduced, onPress }: Props) {
	const ink = {
		ash: useTokenColor("vent-ash"),
		cream: useTokenColor("vent-cream"),
		ember: useTokenColor("vent-ember"),
	};
	// `n` keys the ring: it moves on only when the idle loop has to mount afresh.
	const [ring, setRing] = useState({ lead: false, n: 0, was: recording });
	if (ring.was !== recording) {
		setRing({ lead: !recording, n: ring.n, was: recording });
	}
	const onTransitionEnd = ({ finished }: { finished: boolean }) => {
		if (finished && ring.lead && !recording) {
			setRing({ lead: false, n: ring.n + 1, was: recording });
		}
	};

	return (
		<Pressable
			accessibilityLabel={
				recording ? VENT_COPY.micRecording : VENT_COPY.micIdle
			}
			accessibilityRole="button"
			hitSlop={16}
			onPress={onPress}
		>
			<View className="size-15 items-center justify-center">
				{/* A solid donut (a disc behind a hole): a 2 pt border on a scaled, fading view
				    shows gaps on iOS. Only the disc scales, so while it listens the ring thickens. */}
				<EaseView
					className="absolute size-15 rounded-full"
					key={`${ring.n}-${reduced}`}
					onTransitionEnd={onTransitionEnd}
					{...ringProps(recording, reduced, ring.lead, ink)}
				/>
				<View className="absolute size-14 rounded-full bg-vent-page" />
				<View className="size-13 items-center justify-center rounded-full bg-white/5">
					<Icon
						color={recording ? ink.ember : ink.cream}
						name={recording ? STOP : MIC}
						size={recording ? 20 : 24}
						weight="regular"
					/>
				</View>
			</View>
		</Pressable>
	);
}
