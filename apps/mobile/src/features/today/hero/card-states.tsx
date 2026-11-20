import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { AppText } from "@/components/shared/app-text";
import { EASING, EaseView } from "@/design/ease";
import { loopProps, useLoopRun } from "@/design/ease-loops";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";

const SPIN_MS = 6000;
const PING_MS = 1800;
const PING_REACH = 12;
const DOT = 10;
const ENSO = 34;
const ENSO_STROKE = 14;
const PING_FROM = 0.55;
const ENSO_PATH = "M36.6 70.4 A70 68 0 1 1 34.1 103.4";
const ENSO_DASH = "60 400";
const LINE = "flex-1 text-[15px] leading-[20px]";

export function CardWaiting({ running }: { running: boolean }) {
	const ink = useTokenColor("ember-ink");
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

export function CardNote({
	body,
	tone,
}: {
	body: string;
	tone: "ember" | "subtle";
}) {
	return (
		<View className="flex-row items-center gap-3">
			<View
				className={
					tone === "ember" ? "rounded-full bg-ember" : "rounded-full bg-subtle"
				}
				style={{ height: DOT, width: DOT }}
			/>
			<AppText className={LINE} color="muted" variant="callout">
				{body}
			</AppText>
		</View>
	);
}
