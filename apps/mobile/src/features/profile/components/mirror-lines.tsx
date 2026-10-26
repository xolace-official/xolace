import { SymbolView } from "expo-symbols";
import { Surface, useThemeColor } from "heroui-native";
import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";

type MoodDelta = "lighter" | "same" | "heavier" | "unsure" | "mixed" | null;

type TypicalPattern = { dayOfWeek: number; hourOfDay: number } | null;

type Props = {
	moodDelta: MoodDelta;
	typicalPattern: TypicalPattern;
	staggerDelay?: number;
};

const DAYS = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];

type SFSymbol = React.ComponentProps<typeof SymbolView>["name"];

function moodRow(delta: MoodDelta): { icon: SFSymbol; text: string } | null {
	switch (delta) {
		case "lighter":
			return {
				icon: {
					android: "arrow_circle_up",
					ios: "arrow.up.circle",
					web: "arrow_circle_up",
				},
				text: "Most of your sessions end lighter.",
			};
		case "same":
			return {
				icon: {
					android: "contrast",
					ios: "circle.lefthalf.filled",
					web: "contrast",
				},
				text: "You tend to leave feeling much the same.",
			};
		case "heavier":
			return {
				icon: {
					android: "arrow_circle_down",
					ios: "arrow.down.circle",
					web: "arrow_circle_down",
				},
				text: "Some sessions surface things that feel heavier at close.",
			};
		case "unsure":
			return {
				icon: { android: "help", ios: "questionmark.circle", web: "help" },
				text: "You often sit with uncertainty after.",
			};
		case "mixed":
			return {
				icon: {
					android: "data_usage",
					ios: "circle.dotted",
					web: "data_usage",
				},
				text: "Sessions land differently each time — that's honest.",
			};
		default:
			return null;
	}
}

function rhythmRow(
	pattern: TypicalPattern
): { icon: SFSymbol; text: string } | null {
	if (!pattern) {
		return null;
	}
	const day = DAYS[pattern.dayOfWeek];
	if (!day) {
		return null;
	}
	const h = pattern.hourOfDay;
	let period: string;
	let icon: SFSymbol;
	if (h >= 5 && h < 12) {
		period = "mornings";
		icon = { android: "wb_twilight", ios: "sunrise", web: "wb_twilight" };
	} else if (h >= 12 && h < 17) {
		period = "afternoons";
		icon = { android: "light_mode", ios: "sun.max", web: "light_mode" };
	} else if (h >= 17 && h < 21) {
		period = "evenings";
		icon = { android: "wb_twilight", ios: "sunset", web: "wb_twilight" };
	} else {
		period = "late nights";
		icon = { android: "moon_stars", ios: "moon.stars", web: "moon_stars" };
	}
	return { icon, text: `You arrive most on ${day} ${period}.` };
}

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

export function MirrorLines({
	moodDelta,
	typicalPattern,
	staggerDelay = 240,
}: Props) {
	const accent = useThemeColor("accent") as string;
	const rows = [moodRow(moodDelta), rhythmRow(typicalPattern)].filter(
		Boolean
	) as {
		icon: SFSymbol;
		text: string;
	}[];

	if (rows.length === 0) {
		return null;
	}

	return (
		<EaseView
			animate={{ opacity: 1, translateY: 0 }}
			className="mt-8 px-5"
			initialAnimate={{ opacity: 0, translateY: 8 }}
			transition={{
				delay: staggerDelay,
				duration: 300,
				easing: EASE,
				type: "timing",
			}}
		>
			<AppText className="mb-3.5 text-[11px] text-muted uppercase tracking-widest">
				your patterns
			</AppText>
			<Surface className="p-0 px-4">
				{rows.map((row, i) => (
					<View
						className={`flex-row items-center gap-3.5 py-4 ${i > 0 ? "border-border/50 border-t" : ""}`}
						key={row.text}
					>
						<View
							className="h-9 w-9 items-center justify-center rounded-2xl"
							style={{ backgroundColor: accent + "22" }}
						>
							<SymbolView name={row.icon} size={18} tintColor={accent} />
						</View>
						<AppText className="flex-1 text-[15px] text-foreground/90 leading-5">
							{row.text}
						</AppText>
					</View>
				))}
			</Surface>
		</EaseView>
	);
}
