import { View } from "react-native";
import { Hairline } from "@/components/settings-kit/parts";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { LinearGradient } from "@/components/shared/styled";
import {
	NOTIFY_COPY,
	NOTIFY_ICONS,
} from "@/features/settings/notifications/copy";
import {
	dayPercent,
	daySpan,
	type Quiet,
	SAMPLE_HOUR,
} from "@/features/settings/notifications/notifications-model";
import { useTokenColors } from "@/lib/use-token-color";
import { a11yHidden } from "@/lib/utils";

const ACROSS = { end: { x: 1, y: 0 }, start: { x: 0, y: 0 } };
const EDGE_STOPS = [0, 0.3, 0.7, 1] as const;
/** The labels' places, as keys: "noon" is there twice. */
const TICKS = ["noon", "6pm", "midnight", "6am", "next-noon"] as const;

/**
 * A day from noon to noon (board `.day`): the quiet span in night blue with a moon at its start
 * and a sun at its end, warm edges for the daylight, the sample's dot at 9:30 pm. Hidden from
 * VoiceOver; "Not after" and "Not before" carry the times.
 */
export function DayBar({ quiet }: { quiet: Quiet }) {
	const [sunEdge, sunClear, nightEdge, nightMid, sun, white] = useTokenColors([
		"notify-sun-edge",
		"notify-sun-clear",
		"notify-night-edge",
		"notify-night-mid",
		"notify-sun",
		"on-art",
	]);
	const span = daySpan(quiet);
	return (
		<View className="px-4 pt-1.5 pb-3.5" {...a11yHidden(true)}>
			<View className="h-7.5 rounded-[9px] bg-surface-secondary">
				{/* The board mixes the sun into the well at its edges; drawn here as the sun at 22% over it. */}
				<LinearGradient
					className="absolute inset-0 rounded-[9px]"
					colors={[sunEdge, sunClear, sunClear, sunEdge]}
					locations={EDGE_STOPS}
					{...ACROSS}
				/>
				<LinearGradient
					className="absolute top-0 bottom-0 flex-row items-center justify-between rounded-[9px] px-1.75"
					colors={[nightEdge, nightMid, nightEdge]}
					style={{ left: `${span.left}%`, width: `${span.width}%` }}
					{...ACROSS}
				>
					<View className="opacity-90">
						<Icon color={white} name={NOTIFY_ICONS.moon} size={10} />
					</View>
					<Icon color={sun} name={NOTIFY_ICONS.sun} size={11} />
				</LinearGradient>
				<View
					className="absolute -top-1.5 -ml-1.5 size-3 rounded-full border-2 border-surface bg-notify-dot"
					style={{ left: `${dayPercent(SAMPLE_HOUR)}%` }}
				/>
			</View>
			<View className="mt-1.5 flex-row justify-between">
				{NOTIFY_COPY.dayLabels.map((label, i) => (
					<AppText
						className="text-[11px] text-foreground/45 leading-3.5"
						key={TICKS[i]}
						variant="body"
					>
						{label}
					</AppText>
				))}
			</View>
			<Hairline />
		</View>
	);
}
