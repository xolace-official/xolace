import { useRouter } from "expo-router";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import {
	type Pose,
	PRESETS,
	poseForSteadiness,
} from "@/components/xolace-face/pose";
import { useFace } from "@/components/xolace-face/use-face";
import { XolaceFace } from "@/components/xolace-face/xolace-face";
import { COPY } from "@/features/you/copy";

const F = COPY.steadinessScreen.face;
const ROW_FACE = 64;
const RESTLESS_EXAMPLE = 15;
const SETTLED_EXAMPLE = 90;
const ROWS: { key: keyof typeof F.rows; pose: Pose }[] = [
	{ key: "restless", pose: poseForSteadiness(RESTLESS_EXAMPLE) },
	{ key: "settled", pose: poseForSteadiness(SETTLED_EXAMPLE) },
	{ key: "waiting", pose: PRESETS.waiting },
];

/**
 * What the face in the dial is telling you: production's FaceInfoSheet unchanged, a form sheet
 * sized to its rows (the `steadiness-face-info` route), each row with a small live face showing
 * that motion. They unmount, clocks and all, when the sheet closes.
 */
export function FaceSheet() {
	const router = useRouter();
	return (
		// A plain View so the sheet can fit its content. Top padding clears the grabber.
		<View className="gap-5 px-6 pt-8 pb-8">
			<View className="gap-2">
				<AppText
					accessibilityRole="header"
					className="text-[20px] leading-[26px]"
					variant="title"
					weight="semibold"
				>
					{F.title}
				</AppText>
				<AppText
					className="text-[15px] text-foreground/70 leading-6"
					variant="body"
				>
					{F.lead}
				</AppText>
			</View>
			{ROWS.map((row) => (
				<FaceRow
					body={F.rows[row.key]}
					key={row.key}
					pose={row.pose}
					title={F.titles[row.key]}
				/>
			))}
			<View className="gap-1 rounded-[16px] bg-surface-secondary px-4 py-3">
				<AppText
					className="text-[15px] leading-5"
					variant="callout"
					weight="semibold"
				>
					{F.noteTitle}
				</AppText>
				<AppText
					className="text-[14px] text-foreground/70 leading-5"
					variant="callout"
				>
					{F.noteBody}
				</AppText>
			</View>
			<PressScale
				accessibilityRole="button"
				className="items-center py-2"
				onPress={() => router.back()}
			>
				<AppText
					className="text-[16px] leading-[22px]"
					color="accent"
					variant="body"
				>
					{F.done}
				</AppText>
			</PressScale>
		</View>
	);
}

function FaceRow({
	body,
	pose,
	title,
}: {
	body: string;
	pose: Pose;
	title: string;
}) {
	const face = useFace(pose);
	return (
		<View className="flex-row items-center gap-4">
			<XolaceFace face={face} size={ROW_FACE} />
			<View className="flex-1 gap-0.5">
				<AppText
					className="text-[15px] leading-5"
					variant="callout"
					weight="semibold"
				>
					{title}
				</AppText>
				<AppText
					className="text-[14px] text-foreground/70 leading-5"
					variant="callout"
				>
					{body}
				</AppText>
			</View>
		</View>
	);
}
