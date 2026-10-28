import { Image } from "expo-image";
import { forwardRef, useEffect, useState } from "react";
import type { ViewInstance } from "react-native";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PosterBody } from "@/features/quotes/components/poster/poster-body";
import { PosterSurface } from "@/features/quotes/components/poster/poster-surface";

/** Flux at the fire — the mascot the card carried before the rebuild (#317) */
const MASCOT = require("@/assets/images/flux/campfire-mini.jpeg");

/** the hero's own gutter (`hero-card`'s margin), so the twin lays out at its width */
const HERO_GUTTER = 10;

type Props = {
	title?: string;
	text: string;
	/** fired once the twin is safe to capture: mascot decoded and the fit landed */
	onReady?: () => void;
};

/**
 * The poster twin: what gets exported when the quote is shared (#317).
 *
 * A rebuild, not a capture of the hero — the hero sits in a ScrollView and
 * carries the back button, the star and the action row, none of which belong on
 * a posted image. So the twin composes the same primitives (`PosterSurface` +
 * `PosterBody`) in the hero's own pt geometry, and the export is the hero's
 * aspect scaled up rather than a second, re-laid-out composition.
 *
 * It is always the fixed bright palette, never the sharer's theme: the poster
 * is the one surface where a per-user palette actively costs recognisability
 * (#295). It never carries the source line either — provenance is the screen's
 * Xolace+ entry point, and an export is not a place to sell.
 */
export const SharingCard = forwardRef<ViewInstance, Props>(function SharingCard(
	{ title, text, onReady },
	ref
) {
	const { width } = useWindowDimensions();
	const [mascotLoaded, setMascotLoaded] = useState(false);
	const [fitSettled, setFitSettled] = useState(false);

	// The fit search takes a few frames and paints nothing until it lands, so a
	// capture on layout alone exports a blank paper card.
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

					{/* the wordmark the screen doesn't need: on an export it is the only
              thing saying where the poster came from */}
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
	/* the source is a lilac-backed render, so it is worn as a round badge */
	mascot: { borderRadius: 19, height: 38, width: 38 },
});
