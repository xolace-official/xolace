const MINUTE = 60;
const TWO_DIGITS = 10;

export function fmt(seconds: number): string {
	"worklet";
	const r = Math.max(0, Math.round(seconds));
	const sec = r % MINUTE;
	return `${Math.floor(r / MINUTE)}:${sec < TWO_DIGITS ? "0" : ""}${sec}`;
}

export function fmtVo(seconds: number): string {
	const r = Math.max(0, Math.round(seconds));
	const m = Math.floor(r / MINUTE);
	const sec = r % MINUTE;
	const mins = m ? `${m} ${m === 1 ? "minute" : "minutes"}` : "";
	const secs = sec || !m ? `${sec} ${sec === 1 ? "second" : "seconds"}` : "";
	return [mins, secs].filter(Boolean).join(" ");
}

export const positionVo = (position: number, duration: number) =>
	`${fmtVo(position)} of ${fmtVo(duration)}`;
