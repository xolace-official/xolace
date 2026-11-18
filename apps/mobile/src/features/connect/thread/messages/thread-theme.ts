import { useMemo } from "react";
import { useTokenColors } from "@/lib/use-token-color";

/**
 * The prototype's thread on Stream's own list and composer: 22 pt bubbles all round (no tail),
 * no avatars in a one-to-one thread (the counterpart is in the header), and the composer as a
 * filled 26 pt pill with an ink send button. Bubble colours come from
 * `lib/stream-chat/stream-theme.ts` (yours take the accent, theirs the second surface).
 */
const BUBBLE = 22;
const PILL = 26;
const SEND = 40;
const PILL_HEIGHT = 52;

const ROUND = {
	borderBottomLeftRadius: BUBBLE,
	borderBottomRightRadius: BUBBLE,
	borderCurve: "continuous" as const,
	borderRadius: BUBBLE,
	borderTopLeftRadius: BUBBLE,
	borderTopRightRadius: BUBBLE,
};

export function useThreadStreamStyle() {
	const [well, ink] = useTokenColors(["surface-secondary", "foreground"]);
	// Kept despite the React Compiler: this feeds a context (Stream's ThemeProvider), and a new
	// object re-merges the whole theme and re-renders every bubble.
	return useMemo(
		() => ({
			messageComposer: {
				container: { borderTopWidth: 0 },
				inputBoxWrapper: {
					backgroundColor: well,
					borderCurve: "continuous" as const,
					borderRadius: PILL,
					borderWidth: 0,
					minHeight: PILL_HEIGHT,
				},
				sendButton: {
					backgroundColor: ink,
					borderRadius: SEND / 2,
					height: SEND,
					width: SEND,
				},
				wrapper: { borderTopWidth: 0, paddingTop: 6 },
			},
			messageItemView: {
				authorWrapper: { container: { display: "none" as const } },
				content: { container: ROUND },
			},
		}),
		[well, ink]
	);
}
