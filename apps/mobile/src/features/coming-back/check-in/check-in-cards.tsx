import { Pressable, View } from "react-native";
import { Presets } from "react-native-pulsar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { useScheme } from "@/design/scheme";
import { cn } from "@/lib/cn";
import { useTokenColors } from "@/lib/use-token-color";
import { useCheckIn } from "../check-in-data";
import { ANSWER_LABEL, CHECK_IN, type CheckInPick } from "../copy";
import { ANSWER_LOOK } from "./answer-look";
import { Layer, OVERLAP, TOP_ROUND, VENT_H } from "./card-layer";

const CARD_PAD_BOTTOM = 16 + OVERLAP;
const RES_H = 46;
const RES_PAD = 12;
const INSET_TUCK = 24;
const GLYPH = { chevron: 13, icon: 22, mic: 16 } as const;
const LABEL = { fontSize: 22, letterSpacing: -0.22, lineHeight: 26 } as const;
const VENT = { fontSize: 15 } as const;
const RES = { fontSize: 14 } as const;
const CARD_SHADOW = {
	shadowOffset: { height: -6, width: 0 },
	shadowOpacity: 0.25,
	shadowRadius: 8,
} as const;

function AnswerCard({
	pick,
	onPick,
}: {
	pick: CheckInPick;
	onPick: () => void;
}) {
	const dark = useScheme() === "dark";
	const look = ANSWER_LOOK[pick];
	const [bg, ink, shadow] = useTokenColors([
		dark ? look.dusk : look.bg,
		look.ink,
		"check-in-shadow",
	]);
	return (
		<PressScale
			accessibilityLabel={ANSWER_LABEL[pick]}
			card
			className={cn("flex-row items-center gap-3.5 px-5 pt-5", TOP_ROUND)}
			haptic={Presets.System.selection}
			onPress={onPick}
			style={{
				backgroundColor: bg,
				paddingBottom: CARD_PAD_BOTTOM,
				shadowColor: shadow,
				...CARD_SHADOW,
			}}
		>
			<View
				className={cn(
					"size-13 items-center justify-center rounded-full",
					dark ? "bg-white/8" : "bg-white/75"
				)}
			>
				<Icon color={ink ?? ""} name={look.icon} size={GLYPH.icon} />
			</View>
			<AppText className="flex-1" style={LABEL} variant="headlineL">
				{ANSWER_LABEL[pick]}
			</AppText>
			<View className="size-10 items-center justify-center rounded-full bg-foreground/8">
				<Icon
					color={ink ?? ""}
					name={{ android: "chevron_right", ios: "chevron.right" }}
					size={GLYPH.chevron}
					weight="semibold"
				/>
			</View>
		</PressScale>
	);
}

export function CheckInCards() {
	const { state, actions } = useCheckIn();
	const { picks, picked, careful, reduced } = state;
	const [muted] = useTokenColors(["muted"]);
	const insets = useSafeAreaInsets();
	const any = picked !== null;
	const bottom = Math.max(0, insets.bottom - INSET_TUCK);

	return (
		<View style={{ paddingTop: OVERLAP }}>
			{picks.map((k, j) => (
				<Layer
					chosen={picked === k}
					j={j}
					key={k}
					picked={any}
					reduced={reduced}
				>
					<AnswerCard onPick={() => actions.pick(k)} pick={k} />
				</Layer>
			))}
			<Layer
				chosen={picked === "vent"}
				j={picks.length}
				picked={any}
				reduced={reduced}
			>
				<Pressable
					accessibilityLabel={CHECK_IN.vent.a11y}
					accessibilityRole="button"
					className={cn(
						"flex-row items-center justify-center gap-2.5 bg-surface px-5 pt-1",
						TOP_ROUND
					)}
					onPress={() => {
						Presets.flick();
						actions.vent();
					}}
					style={{
						minHeight: VENT_H + (careful ? 0 : bottom),
						paddingBottom: careful ? 0 : bottom,
					}}
				>
					<Icon
						color={muted ?? ""}
						name={{ android: "mic", ios: "mic" }}
						size={GLYPH.mic}
					/>
					<AppText
						center
						className="shrink"
						color="muted"
						style={VENT}
						variant="callout"
						weight="medium"
					>
						<AppText style={VENT} variant="callout" weight="semibold">
							{CHECK_IN.vent.label}
						</AppText>
						{`  ${CHECK_IN.vent.sub}`}
					</AppText>
				</Pressable>
			</Layer>
			{careful ? (
				<Layer
					chosen={false}
					j={picks.length + 1}
					picked={any}
					reduced={reduced}
				>
					<Pressable
						accessibilityRole="link"
						className="items-center justify-center bg-surface"
						onPress={actions.resources}
						style={{
							marginTop: OVERLAP,
							minHeight: RES_H + bottom,
							paddingBottom: RES_PAD + bottom,
						}}
					>
						<AppText
							className="underline"
							color="dangerInk"
							style={RES}
							variant="callout"
							weight="semibold"
						>
							{CHECK_IN.resources}
						</AppText>
					</Pressable>
				</Layer>
			) : null}
		</View>
	);
}
