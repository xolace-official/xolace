import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { AppText } from "@/components/shared/app-text";
import { EASING, EaseView } from "@/design/ease";
import { loopProps, useLoopRun } from "@/design/ease-loops";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";

/** Board `rest*`: the ensō turns once per 6 s; the ready dot pings every 1.8 s, out to 12 pt. */
const SPIN_MS = 6000;
const PING_MS = 1800;
const PING_REACH = 12;
const DOT = 10;
const ENSO = 34;
const ENSO_STROKE = 14;
const PING_FROM = 0.55;
/** An open brush circle, 60 of its ~430 units drawn. */
const ENSO_PATH = "M36.6 70.4 A70 68 0 1 1 34.1 103.4";
const ENSO_DASH = "60 400";
/** Board `.rready` copy line: 15 / 20. */
const LINE = "flex-1 text-[15px] leading-[20px]";

/**
 * Today's card while Reflect is away (board lines 72–90): still with your words, or the mirror
 * back. One shows in place of the field. Both loops are native (Ease) and rest still when the
 * card is off screen, Today isn't live, or motion is reduced.
 */
export function CardWaiting({ running }: { running: boolean }) {
	const ink = useTokenColor("ember-ink");
	// A loop starts only when its view mounts: keyed by run, it starts again after a stop.
	const run = useLoopRun(running, SPIN_MS);
	const spin = loopProps({
		easing: "linear",
		from: { rotate: 0 },
		mode: "repeat",
		periodMs: SPIN_MS,
		reduced: !running,
		to: { rotate: 360 },
	});
	return (
		<View className="flex-row items-center gap-3">
			<EaseView key={run} {...spin} style={{ height: ENSO, width: ENSO }}>
				<Svg height={ENSO} viewBox="0 0 200 200" width={ENSO}>
					<Path
						d={ENSO_PATH}
						fill="none"
						stroke={ink}
						strokeDasharray={ENSO_DASH}
						strokeLinecap="round"
						strokeWidth={ENSO_STROKE}
					/>
				</Svg>
			</EaseView>
			<AppText className={LINE} color="muted" variant="callout">
				{COPY.card.waiting.body}
			</AppText>
		</View>
	);
}

export function CardReady({ running }: { running: boolean }) {
	// Board `ping`: a ring from the dot out to 12 pt, .55 → 0, on out-quad; stopped, it rests on the dot.
	const run = useLoopRun(running, PING_MS);
	const ring = loopProps({
		easing: EASING.outQuad,
		from: { opacity: PING_FROM, scale: 1 },
		mode: "repeat",
		periodMs: PING_MS,
		reduced: !running,
		to: { opacity: 0, scale: 1 + (2 * PING_REACH) / DOT },
	});
	return (
		<View className="flex-row items-center gap-3">
			<View style={{ height: DOT, width: DOT }}>
				<EaseView
					key={run}
					{...ring}
					className="absolute inset-0 rounded-full bg-ember"
				/>
				<View className="flex-1 rounded-full bg-ember" />
			</View>
			<AppText className={LINE} color="muted" variant="callout">
				{COPY.card.ready.body}
			</AppText>
		</View>
	);
}
