import { checkInPose } from "./face/session-face";
import type { SessionFace } from "./face/use-session-face";
import type { MoodSlider } from "./moment-one/use-mood-slider";
import type { Send } from "./moment-two/use-send";
import { snap, stepOf } from "./mood-scale";
import { T1, T2, TS } from "./session-look";
import type { MomentFlow } from "./use-moment-flow";
import type { Clock, SessionClocks } from "./use-session-clocks";

export type Scene = {
	position?: number;
	unsure?: boolean;
	grab?: true;
	moment?: 2;
	share?: "hold" | "sent" | "kept";
	at?: { clock: Clock; ms: number };
};

type Parts = {
	flow: MomentFlow;
	slider: MoodSlider;
	clocks: SessionClocks;
	send: Send;
	face: SessionFace;
};

export function applyScene(
	scene: Scene,
	{ flow, slider, clocks, send, face }: Parts
) {
	const { position, at } = scene;
	if (position !== undefined) {
		slider.place(position);
		flow.position.set(position);
		flow.setAnswer({ moment: 1, step: stepOf(snap(position)), unsure: false });
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
