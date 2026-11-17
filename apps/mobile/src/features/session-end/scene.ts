import { checkInPose } from "./face/session-face";
import type { SessionFace } from "./face/use-session-face";
import type { MoodSlider } from "./moment-one/use-mood-slider";
import type { Send } from "./moment-two/use-send";
import { snap, stepOf } from "./mood-scale";
import { T1, T2, TS } from "./session-look";
import type { MomentFlow } from "./use-moment-flow";
import type { Clock, SessionClocks } from "./use-session-clocks";

/**
 * Where a dev state opens the screen: an answer already given, moment 2, the
 * share in some state, or a clock held at one instant for a mid-motion frame.
 * The route never passes one; the screen then simply arrives.
 */
export type Scene = {
	/** The thumb let go here (0 heavier … 1 lighter). */
	position?: number;
	unsure?: boolean;
	/** The finger still down on the track (the rail swollen, the thumb grown). */
	grab?: true;
	moment?: 2;
	share?: "hold" | "sent" | "kept";
	/** Hold this clock at this ms (and the earlier ones at their end). */
	at?: { clock: Clock; ms: number };
};

type Parts = {
	flow: MomentFlow;
	slider: MoodSlider;
	clocks: SessionClocks;
	send: Send;
	face: SessionFace;
};

/** Puts the screen in `scene` straight after its arrival started. */
export function applyScene(
	scene: Scene,
	{ flow, slider, clocks, send, face }: Parts
) {
	const { position, at } = scene;
	if (position !== undefined) {
		slider.place(position);
		flow.position.set(position);
		flow.setAnswer({ moment: 1, step: stepOf(snap(position)), unsure: false });
		// Already at the centre, the thumb doesn't move, so the face wouldn't follow.
		face.face.hold(checkInPose(position));
	}
	if (scene.grab) {
		slider.grab.set(1);
	}
	if (scene.unsure) {
		flow.pickUnsure();
	}
	const settled = at === undefined || at.clock !== "c1";
	if (settled) {
		clocks.c1.set(T1.end);
	}
	if (scene.moment === 2) {
		flow.toMoment2(at?.clock === "c2" ? at.ms : T2.end);
	}
	if (scene.share === "hold") {
		send.holdNow();
	} else if (scene.share === "sent") {
		send.sent(at?.clock === "cs" ? at.ms : TS.end);
	} else if (scene.share === "kept") {
		send.kept();
	}
	if (at) {
		clocks[at.clock].set(at.ms);
	}
}
