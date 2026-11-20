import { useEffect } from "react";
import {
	useFixtureBackend,
	type VentFixture,
} from "@/features/vent/dev/use-fixture-backend";
import { useVentFlow, type VentSeed } from "@/features/vent/flow/use-vent-flow";
import { VentProvider } from "@/features/vent/vent-data";
import { VentScreen } from "@/features/vent/vent-screen";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

export type Play =
	| "none"
	| "speak"
	| "tap"
	| "pinch"
	| "flick"
	| "reply"
	| "ash"
	| "gone"
	| "mic";

const LANDED_MS = 400;
const SPEAK_MS = 2600;
const MIC_TAP_MS = 500;
const PINCH_MS = 260;
const FLICK = { x: 0.18, y: -0.98 } as const;

type Props = {
	fixture: VentFixture;
	seed?: VentSeed;
	play?: Play;
	reduced?: boolean;
};

export function FixtureVent({ fixture, seed, play = "none", reduced }: Props) {
	const deviceReduced = useEffectiveReducedMotion();
	const rm = reduced ?? deviceReduced;
	const backend = useFixtureBackend(fixture, rm);
	const { vent, steps } = useVentFlow(backend, rm, seed);

	useEffect(() => {
		const ids: ReturnType<typeof setTimeout>[] = [];
		const at = (ms: number, fn: () => void) =>
			ids.push(setTimeout(fn, LANDED_MS + ms));
		const speaks = ["speak", "tap", "pinch", "flick"].includes(play);
		if (speaks) {
			at(0, steps.startRec);
		}
		if (play === "tap" || play === "pinch") {
			at(SPEAK_MS, () => steps.release("tap"));
		}
		if (play === "pinch") {
			at(SPEAK_MS + PINCH_MS, steps.burst);
		}
		if (play === "flick") {
			at(SPEAK_MS, () => steps.release("flick", FLICK.x, FLICK.y));
		}
		if (play === "reply") {
			at(0, steps.afterBurn);
		}
		if (play === "ash") {
			at(0, steps.toAsh);
		}
		if (play === "gone") {
			at(0, steps.toGone);
		}
		if (play === "mic") {
			at(MIC_TAP_MS, vent.actions.tapMic);
		}
		return () => {
			for (const id of ids) {
				clearTimeout(id);
			}
		};
		// Once per visit.
	}, []);

	return (
		<VentProvider value={vent}>
			<VentScreen />
		</VentProvider>
	);
}
