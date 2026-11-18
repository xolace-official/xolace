import { type StyleProp, View, type ViewStyle } from "react-native";
import { cn } from "@/lib/cn";
import { EmberSeal } from "./ember-seal";
import { PAPER_CLASS, PAPER_RADIUS, SHEET, useLetterInk } from "./letter-paper";

/**
 * The folded letter's sizes. `shelf`: the Connect card and the Letters screen row (54 × 34).
 * `card`: the limit line and the session-end tile's bigger sibling (120 × 52). `write` and
 * `read`: a full sheet folded in thirds, a third of its height across the full width.
 */
const SIZES = {
	card: { height: 52, radius: 4, seal: 22, width: 120 },
	read: {
		height: SHEET.read.height / 3,
		radius: PAPER_RADIUS,
		seal: 34,
		width: undefined,
	},
	shelf: { height: 34, radius: 3, seal: 14, width: 54 },
	/** The session-end card's tile. */
	tile: { height: 16, radius: 2, seal: 10, width: 26 },
	write: {
		height: SHEET.write.height / 3,
		radius: PAPER_RADIUS,
		seal: 0,
		width: undefined,
	},
} as const;
export type FoldedSize = keyof typeof SIZES;

type Props = {
	size: FoldedSize;
	/** The ember seal on its bottom edge (on by default where the size has one). */
	sealed?: boolean;
	/** The seal parts (the read size, as it opens). */
	split?: boolean;
	style?: StyleProp<ViewStyle>;
};

/**
 * The folded letter: the paper's back, one soft shadow, the seal centred on its bottom edge.
 * Full-width sizes keep the sheet's 24 pt margins.
 */
export function FoldedLetter({ size, sealed, split = false, style }: Props) {
	const ink = useLetterInk();
	const s = SIZES[size];
	const seal = s.seal > 0 && (sealed ?? true);
	const full = s.width === undefined;
	return (
		<View
			className={cn(
				PAPER_CLASS[ink.light].back,
				full ? "self-stretch" : "self-start"
			)}
			style={[
				{
					borderRadius: s.radius,
					boxShadow: ink.shadow,
					height: s.height,
					marginHorizontal: full ? SHEET.margin : 0,
					width: s.width,
				},
				style,
			]}
		>
			{seal ? (
				<View
					className="absolute right-0 left-0 items-center"
					style={{ bottom: -s.seal / 2 }}
				>
					<EmberSeal size={s.seal} split={split} />
				</View>
			) : null}
		</View>
	);
}
