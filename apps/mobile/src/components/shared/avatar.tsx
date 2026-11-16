import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { LinearGradient } from "@/components/shared/styled";
import { useThemeFaces } from "@/design/fonts";

const ART_START = { x: 0.1, y: 0 };
const ART_END = { x: 0.9, y: 1 };
const DEFAULT_SIZE = 48;
/** The initial and its line height, and the presence dot, as parts of the size. */
const INITIAL = 0.36;
const INITIAL_LINE = 0.42;
const DOT = 0.27;
const MIN_DOT = 11;

/**
 * Peer avatars are initials on their own gradient; presence is a small dot.
 * Every size here comes from the `size` prop, so sizes stay in `style`; shape
 * and colour are classes.
 * @public The redesign's shared kit (F5), for the screen PRs.
 */
export function Avatar({
	initial,
	art,
	size = DEFAULT_SIZE,
	online,
	className,
}: {
	initial: string;
	/** The peer's two gradient stops: content data, not theme colours. */
	art: readonly [string, string];
	size?: number;
	online?: boolean;
	className?: string;
}) {
	const faces = useThemeFaces();
	const dot = Math.max(MIN_DOT, size * DOT);
	return (
		<View className={className} style={{ height: size, width: size }}>
			<LinearGradient
				className="items-center justify-center rounded-full"
				colors={art}
				end={ART_END}
				start={ART_START}
				style={{ height: size, width: size }}
			>
				{/* The heading face, so it caps Dynamic Type as headings do. */}
				<AppText
					className="text-white"
					style={{
						fontFamily: faces["display-bold"],
						fontSize: size * INITIAL,
						lineHeight: size * INITIAL_LINE,
					}}
					variant="headline"
				>
					{initial}
				</AppText>
			</LinearGradient>
			{online ? (
				<View
					className="absolute right-0 bottom-0 rounded-full border-[2.5px] border-background bg-success"
					style={{ height: dot, width: dot }}
				/>
			) : null}
		</View>
	);
}
