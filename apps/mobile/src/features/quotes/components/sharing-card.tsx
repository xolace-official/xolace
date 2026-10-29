import { Image } from "expo-image";
import { forwardRef, useEffect, useState } from "react";
import type { ViewInstance } from "react-native";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PosterBody } from "@/features/quotes/components/poster/poster-body";
import { PosterSurface } from "@/features/quotes/components/poster/poster-surface";

const MASCOT = require("@/assets/images/flux/campfire-mini.jpeg");

/** `hero-card`'s margin, so the twin lays out at the hero's width. */
const HERO_GUTTER = 10;

type Props = {
	title?: string;
	text: string;
	/** Fired once the twin is safe to capture: mascot decoded and the fit landed. */
	onReady?: () => void;
};

/** The poster twin exported on share (#317): the hero's primitives without its chrome, always
 * the fixed palette (#295), never the source line. */
export const SharingCard = forwardRef<ViewInstance, Props>(function SharingCard(
	{ title, text, onReady },
	ref
) {
	const { width } = useWindowDimensions();
	const [mascotLoaded, setMascotLoaded] = useState(false);
	const [fitSettled, setFitSettled] = useState(false);

	// The fit search paints nothing for a few frames; a capture on layout alone exports blank.
	useEffect(() => {
		if (mascotLoaded && fitSettled) {
			onReady?.();
		}
	}, [mascotLoaded, fitSettled, onReady]);

	return (
		<View
			collapsable={false}
			ref={ref}
			style={{ width: width - HERO_GUTTER * 2 }}
		>
			<PosterSurface>
				<View className="px-5 pt-7 pb-6">
					<AppText className="max-w-57.5 font-poster-display text-[37px] text-poster-ink leading-[36.8px] tracking-[1.6px]">
						{"TODAY'S\n"}
						<AppText className="font-poster-display text-[37px] text-poster-ink-soft leading-9.2 tracking-[1.6px]">
							QUOTE
						</AppText>
					</AppText>

					<View className="mt-5 rounded-[20px] bg-poster-paper p-4.5">
						<PosterBody
							body={text}
							onSettled={() => setFitSettled(true)}
							title={title}
						/>
					</View>

					{/* On an export the wordmark is the only thing saying where the poster came
					    from. */}
					<View className="mt-5 flex-row items-center gap-2">
						<Image
							contentFit="cover"
							onLoadEnd={() => setMascotLoaded(true)}
							source={MASCOT}
							style={styles.mascot}
						/>
						<AppText className="font-poster-display text-[15px] text-poster-ink-soft tracking-[1.6px]">
							XOLACE
						</AppText>
					</View>
				</View>
			</PosterSurface>
		</View>
	);
});

const styles = StyleSheet.create({
	mascot: { borderRadius: 19, height: 38, width: 38 },
});
