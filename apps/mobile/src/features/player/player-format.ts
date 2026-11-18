/** The board's `fmt` and `fmtVo`. `fmt` is a worklet, so the UI thread prints the time while
 * scrubbing without React. */
const MINUTE = 60;
const TWO_DIGITS = 10;

/** "3:06". */
export function fmt(seconds: number): string {
	"worklet";
	const r = Math.max(0, Math.round(seconds));
	const sec = r % MINUTE;
	return `${Math.floor(r / MINUTE)}:${sec < TWO_DIGITS ? "0" : ""}${sec}`;
}

/** "3 minutes 6 seconds", for VoiceOver. */
export function fmtVo(seconds: number): string {
	const r = Math.max(0, Math.round(seconds));
	const m = Math.floor(r / MINUTE);
	const sec = r % MINUTE;
	const mins = m ? `${m} ${m === 1 ? "minute" : "minutes"}` : "";
	const secs = sec || !m ? `${sec} ${sec === 1 ? "second" : "seconds"}` : "";
	return [mins, secs].filter(Boolean).join(" ");
}

/** The scrubber's VoiceOver value: "3 minutes 6 seconds of 8 minutes 12 seconds". */
export const positionVo = (position: number, duration: number) =>
	`${fmtVo(position)} of ${fmtVo(duration)}`;
