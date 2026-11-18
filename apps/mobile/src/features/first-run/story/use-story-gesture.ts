import { usePanGesture } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";
import { clamp } from "../first-run-motion";
import { EMB } from "./story-points-draw";
import {
	EV,
	FIRE0,
	FLD,
	goBeat,
	KIND,
	LEFT_TAP,
	type SEng,
	SKY,
	SWIPE,
	XS,
} from "./story-scene";

const SLOP = 10;
const CARD_THROW = 70;
const CARD_SPEED = 500;
const ZOOM_PER = 170;
const VENT_FROM = 420;
const EMBER_HIT = 26;
const HOLD = 600;

function inside(
	x: number,
	y: number,
	r: { x: number; y: number; w: number; h: number }
) {
	"worklet";
	return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** A tap that touches the beat's one thing (board `up()`); false if it was a plain tap. */
function touch(e: SEng, x: number, y: number) {
	"worklet";
	if (e.beat === 0 && y > 430 && y < 740 && Math.abs(x - FIRE0.x) < 110) {
		e.puff = e.now;
		return true;
	}
	if (e.beat === 1 && y > 560 && y < 720) {
		e.ripX = x;
		e.ripY = Math.max(604, y);
		e.ripAt = e.now;
		e.mwi = (e.mwi + 1) % 4;
		return true;
	}
	if (e.beat === 3 && y > FLD.y && y < FLD.y + FLD.h) {
		let best = -1;
		let bd = EMBER_HIT;
		for (let i = 0; i < EMB.length; i++) {
			const d = Math.hypot(
				FLD.x + EMB[i].x * FLD.w - x,
				FLD.y + EMB[i].y * FLD.h - y
			);
			if (d < bd) {
				bd = d;
				best = i;
			}
		}
		if (best >= 0) {
			e.flareI = best;
			e.flareAt = e.now;
			return true;
		}
	}
	return false;
}

/**
 * The story's one gesture, on the UI thread: tap to go on (the left 130 pt goes back), swipe, hold
 * to pause; drag a Xolacer's card, drag the Xolace+ panel, hold the fire to vent, touch the beat's
 * one thing. Positions are in the board's frame (`dx`, `dy` off the screen's).
 */
export function useStoryGesture(
	eng: SharedValue<SEng>,
	dx: number,
	dy: number
) {
	return usePanGesture({
		minDistance: 0,
		onBegin: (ev) => {
			eng.modify((e) => {
				"worklet";
				if (e.seatAt >= 0) {
					return e;
				}
				const x = ev.x - dx;
				const y = ev.y - dy;
				let kind: number = KIND.tap;
				if (!e.rm) {
					if (e.beat === 4 && inside(x, y, XS)) {
						kind = KIND.card;
					} else if (e.beat === 5 && inside(x, y, SKY)) {
						kind = KIND.zoom;
						e.zUser = true;
					} else if (e.beat === 2 && y > VENT_FROM) {
						kind = KIND.vent;
						e.holding = true;
						e.hint = 1;
						e.ev |= EV.rumble;
					}
				}
				e.kind = kind;
				e.sx = x;
				e.sy = y;
				e.lx = x;
				e.ly = y;
				e.lt = e.now;
				e.t0d = e.now;
				e.z0 = e.zoom;
				e.moved = false;
				e.vx = 0;
				return e;
			});
		},
		onFinalize: () => {
			eng.modify((e) => {
				"worklet";
				const kind = e.kind;
				e.kind = KIND.none;
				if (kind === KIND.none || e.seatAt >= 0) {
					return e;
				}
				const mx = e.lx - e.sx;
				const my = e.ly - e.sy;
				if (kind === KIND.vent) {
					e.holding = false;
					e.hint = 2;
					e.goneAt = e.now;
					return e;
				}
				if (kind === KIND.card) {
					if (Math.abs(mx) > CARD_THROW || Math.abs(e.vx) > CARD_SPEED) {
						e.xdx0 = Math.abs(mx);
						e.flyFrom = e.xk;
						e.flyDir = Math.sign(mx) || -1;
						e.flyAt = e.now;
						e.xk = (e.xk + 1) % 3;
						e.ev |= EV.flick;
					}
					e.xdx = 0;
					return e;
				}
				if (kind === KIND.zoom) {
					if (e.zoom > 0.9) {
						e.ev |= EV.tick;
					}
					return e;
				}
				if (Math.abs(mx) > SWIPE && Math.abs(mx) > Math.abs(my)) {
					goBeat(e, e.beat + (mx < 0 ? 1 : -1));
					return e;
				}
				if (e.moved) {
					return e;
				}
				// A hold paused the story; letting go carries on where it was (the board also moved on).
				if (e.now - e.t0d > HOLD) {
					return e;
				}
				if (!e.rm && touch(e, e.sx, e.sy)) {
					e.ev |= EV.flick;
					return e;
				}
				goBeat(e, e.beat + (e.sx < LEFT_TAP ? -1 : 1));
				return e;
			});
		},
		onUpdate: (ev) => {
			eng.modify((e) => {
				"worklet";
				if (e.kind === KIND.none) {
					return e;
				}
				const x = ev.x - dx;
				const y = ev.y - dy;
				const mx = x - e.sx;
				const my = y - e.sy;
				if (!e.moved && Math.hypot(mx, my) > SLOP) {
					e.moved = true;
				}
				if (e.kind === KIND.card && e.moved) {
					e.xdx = mx;
					e.xMoved = true;
				}
				if (e.kind === KIND.zoom && e.moved) {
					e.zoom = clamp(e.z0 + my / ZOOM_PER);
				}
				e.vx = ((x - e.lx) / Math.max(1, e.now - e.lt)) * 1000;
				e.lx = x;
				e.ly = y;
				e.lt = e.now;
				return e;
			});
		},
	});
}
