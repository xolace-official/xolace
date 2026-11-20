import {
	BADGE_AFTER_MS,
	type Eng,
	freshEng,
	LAND,
	MODE,
	PH,
} from "@/features/achievements/arrival/arrival-motion";

export type Still = {
	at: number;
	next?: boolean;
	step?: number;
	turned?: boolean;
};

export function startEng(
	hasMilestone: boolean,
	reduced: boolean,
	still?: Still
): Eng {
	const e = freshEng(hasMilestone, reduced);
	if (!still) {
		return e;
	}
	const { now } = e;
	const { at } = still;
	if (hasMilestone && !still.next) {
		e.tm = now - at;
		e.lm = at;
		return e;
	}
	e.phase = PH.badge;
	if (hasMilestone) {
		e.tm = 0;
		e.to = now - at;
		e.ta = e.to + BADGE_AFTER_MS;
	} else {
		e.ta = now - at;
	}
	e.step = still.step ?? 0;
	if (e.step > 0) {
		e.tx = e.ta;
		e.rain = false;
	}
	const a = now - e.ta;
	e.tu = a >= LAND ? e.ta + LAND : -1;
	e.la = a;
	if (still.turned) {
		e.spin = Math.PI;
		e.turned = true;
	}
	return e;
}

export function toBadges(e: Eng) {
	"worklet";
	e.phase = PH.badge;
	e.to = e.now;
	e.ta = e.now + BADGE_AFTER_MS;
	e.rain = true;
	e.la = -1;
}

export function toNextBadge(e: Eng) {
	"worklet";
	e.step += 1;
	e.tx = e.now;
	e.ta = e.now;
	e.tu = -1;
	e.rain = false;
	e.spin = 0;
	e.v = 0;
	e.mode = MODE.none;
	e.turned = false;
	e.la = -1;
}

export function toClose(e: Eng) {
	"worklet";
	if (e.tc < 0) {
		e.tc = e.now;
	}
}
