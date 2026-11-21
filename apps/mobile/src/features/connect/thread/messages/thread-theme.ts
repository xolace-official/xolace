import { useMemo } from "react";
import { useTokenColors } from "@/lib/use-token-color";

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
