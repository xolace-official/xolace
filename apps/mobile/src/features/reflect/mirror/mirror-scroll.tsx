import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode, useState } from "react";
import { Platform, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

/** How far the text fades out under the header and above the actions once it scrolls. */
const FADE = { bottom: 28, top: 12 } as const;
const MASK = [
	"rgba(0,0,0,0)",
	"rgba(0,0,0,1)",
	"rgba(0,0,0,1)",
	"rgba(0,0,0,0)",
] as const;
const OVERFLOW_SLACK = 1;

type Props = {
	/** Where the first line starts, from the top of the screen. */
	top: number;
	/** Where the text must stop, from the bottom of the screen (above the actions). */
	bottom: number;
	side: number;
	gap: number;
	children: ReactNode;
};

/**
 * The mirror's column. A short mirror sits still where it always has; a long
 * one scrolls between the header and the actions instead of running under
 * them, with its edges faded so it reads as "there's more" (iOS; Android
 * clips, since a mask over the write-in's text shadows is costly there).
 */
export function MirrorScroll({ top, bottom, side, gap, children }: Props) {
	const [viewH, setViewH] = useState(0);
	const [contentH, setContentH] = useState(0);
	const overflows = viewH > 0 && contentH > viewH + OVERFLOW_SLACK;

	const scroll = (
		<ScrollView
			contentContainerStyle={{
				gap,
				paddingBottom: overflows ? FADE.bottom : 0,
				paddingHorizontal: side,
				paddingTop: FADE.top,
			}}
			onContentSizeChange={(_, h) => setContentH(h)}
			onLayout={(e) => setViewH(e.nativeEvent.layout.height)}
			scrollEnabled={overflows}
			showsVerticalScrollIndicator={overflows}
			style={{ flex: 1 }}
		>
			{children}
		</ScrollView>
	);

	return (
		<View
			className="absolute inset-x-0"
			pointerEvents="box-none"
			style={{ bottom, top: top - FADE.top }}
		>
			{overflows && Platform.OS === "ios" ? (
				<MaskedView
					maskElement={
						<LinearGradient
							colors={MASK}
							locations={[0, FADE.top / viewH, 1 - FADE.bottom / viewH, 1]}
							style={{ flex: 1 }}
						/>
					}
					style={{ flex: 1 }}
				>
					{scroll}
				</MaskedView>
			) : (
				scroll
			)}
		</View>
	);
}
