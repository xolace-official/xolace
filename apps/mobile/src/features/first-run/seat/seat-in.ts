import { type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { ease, fs, seg } from "../first-run-motion";
import { AUTH, ageAuth, ageSeat, type SEng } from "../story/story-scene";

const NOT_YET = 9999;

/** The seat's age, or long past while it isn't open (its pieces read it to arrive). */
export function seatAge(e: SEng) {
	"worklet";
	const sa = ageSeat(e);
	return sa < 0 ? NOT_YET : sa;
}

/** How far the seat's controls have gone once seated (board 1850–2200). */
export function seatedOut(e: SEng) {
	"worklet";
	const aa = ageAuth(e);
	if (aa < 0) {
		return 0;
	}
	return e.rm
		? Math.min(1, Math.max(0, (aa - AUTH.seated) / 200))
		: ease(seg(aa, AUTH.seated + 50, AUTH.seated + 400));
}

/** A seat piece arriving at `at` over `dur`, rising `dy` on a spring (board `sIn`). */
export function useSeatIn(
	eng: SharedValue<SEng>,
	at: number,
	dur: number,
	dy: number
) {
	return useAnimatedStyle(() => {
		const e = eng.get();
		const s = seatAge(e);
		if (e.rm) {
			return { opacity: 1, transform: [{ translateY: 0 }] };
		}
		return {
			opacity: ease(seg(s, at, at + dur)),
			transform: [{ translateY: dy * (1 - fs((s - at) / 1000, 10, 0.8)) }],
		};
	});
}
