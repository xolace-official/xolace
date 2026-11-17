import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { useThemeFaces } from "@/design/fonts";
import {
	READING_MODES,
	type ReadingModeKey,
	useReadingFonts,
} from "@/features/lantern/reader/reading-modes";
import { useAppearance } from "@/features/lantern/reader/sheets/sheets-data";
import { cn } from "@/lib/cn";
import { useTokenColors } from "@/lib/use-token-color";

const LINES = [1, 0.85, 0.95, 0.6] as const;
const ROOMY = 1.6;

/** The page and ink each mode's card shows, from its tokens; Classic is the app's own. */
const PAGE_TOKENS = {
	app: ["background", "foreground"],
	night: ["reader-night-bg", "reader-night-ink"],
	paper: ["reader-paper-bg", "reader-paper-ink"],
} as const;

/** One reading mode: "Aa" in its face and four lines on its page (3:4), its name and blurb. */
export function ModeCard({ mode }: { mode: ReadingModeKey }) {
	const { state, actions } = useAppearance();
	const faces = useThemeFaces();
	const loaded = useReadingFonts();
	const { label, blurb, lineHeight, face, page } = READING_MODES[mode];
	const [bg, ink] = useTokenColors(PAGE_TOKENS[page]);
	const on = state.mode === mode;
	const aa = face && loaded ? face.bold : faces["display-bold"];
	return (
		<Pressable
			accessibilityHint={blurb}
			accessibilityLabel={label}
			accessibilityRole="radio"
			accessibilityState={{ checked: on }}
			className="flex-1 items-center active:opacity-70"
			onPress={() => actions.setMode(mode)}
		>
			<View
				className={cn(
					"aspect-3/4 w-full justify-between rounded-[16px]",
					on ? "border-2 border-accent p-[11px]" : "border border-separator p-3"
				)}
				style={{ backgroundColor: bg, borderCurve: "continuous" }}
			>
				<AppText
					className="text-[26px] leading-[28px]"
					style={{ color: ink, fontFamily: aa }}
					variant="body"
				>
					Aa
				</AppText>
				<View className={lineHeight > ROOMY ? "gap-1.5" : "gap-1"}>
					{LINES.map((w) => (
						<View
							className="h-0.5 rounded-[1px] opacity-60"
							key={w}
							style={{ backgroundColor: ink, width: `${w * 100}%` }}
						/>
					))}
				</View>
			</View>
			<AppText
				className="mt-2 text-[14px] leading-[18px]"
				variant="callout"
				weight={on ? "bold" : "semibold"}
			>
				{label}
			</AppText>
			<AppText
				center
				className="text-[11px] leading-[14.3px]"
				color="muted"
				variant="caption"
			>
				{blurb}
			</AppText>
		</Pressable>
	);
}
