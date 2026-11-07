// What the face in the steadiness dial is telling you: a native formSheet sized to its rows
// (the `steadiness-face-info` route), like the report sheet; iOS 26 paints its own glass
// behind it. Each row has a small live face showing that motion. They unmount, clocks and
// all, when the sheet closes.

import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import {
	type Pose,
	PRESETS,
	poseForSteadiness,
} from "@/features/xolace-face/pose";
import { useFace } from "@/features/xolace-face/use-face";
import { XolaceFace } from "@/features/xolace-face/xolace-face";

const ROW_FACE = 64;
const RESTLESS_EXAMPLE = 15;
const SETTLED_EXAMPLE = 90;

const ROWS: { body: string; key: string; pose: Pose; title: string }[] = [
	{
		body: "When things have been up and down lately, it fidgets and sways. The more it moves, the less steady the last few weeks have been.",
		key: "restless",
		pose: poseForSteadiness(RESTLESS_EXAMPLE),
		title: "Restless",
	},
	{
		body: "As things steady, it settles and keeps still. Calm and still means your weeks have been holding steady.",
		key: "settled",
		pose: poseForSteadiness(SETTLED_EXAMPLE),
		title: "Settled",
	},
	{
		body: "Before Xolace knows two parts of your life, it waits quietly with soft eyes. Nothing to read yet.",
		key: "waiting",
		pose: PRESETS.waiting,
		title: "Waiting",
	},
];

export function FaceInfoSheet() {
	const router = useRouter();
	return (
		// A plain View so fitToContents can size the sheet. Top padding clears the grabber.
		<View className="gap-5 px-6 pt-8 pb-8">
			<View className="gap-2">
				<AppText accessibilityRole="header" className="font-semibold text-xl">
					Reading the face
				</AppText>
				<AppText className="text-[15px] text-foreground/70 leading-6">
					The face shows how steady things have been, not how you feel. It shows
					that through how much it moves.
				</AppText>
			</View>

			{ROWS.map((row) => (
				<FaceRow
					body={row.body}
					key={row.key}
					pose={row.pose}
					title={row.title}
				/>
			))}

			<View className="gap-1 rounded-2xl bg-surface px-4 py-3">
				<AppText className="font-semibold text-[15px]">
					Its expression never changes with your score
				</AppText>
				<AppText className="text-[14px] text-foreground/70 leading-5">
					A low number doesn't get a frown, and a high one doesn't get a bigger
					smile. Steadiness isn't the same as happiness.
				</AppText>
			</View>

			<Pressable
				accessibilityRole="button"
				className="items-center py-2 active:opacity-60"
				onPress={() => router.back()}
			>
				<AppText className="text-accent text-base">Got it</AppText>
			</Pressable>
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
				<AppText className="font-semibold text-[15px]">{title}</AppText>
				<AppText className="text-[14px] text-foreground/70 leading-5">
					{body}
				</AppText>
			</View>
		</View>
	);
}
