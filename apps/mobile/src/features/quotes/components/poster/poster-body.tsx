import { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/components/shared/app-text";
import { useFitFontSize } from "@/features/quotes/use-fit-font-size";

/** Fraction of the screen height (SE 233, 17 Pro 306). */
const BODY_BOX_RATIO = 0.35;

/** The box the quote fills. Shared so the skeleton is the same shape (#309). */
export function usePosterBoxHeight() {
	const { height } = useWindowDimensions();
	return Math.round(height * BODY_BOX_RATIO);
}
const LINE_HEIGHT_RATIO = 1.5;

/** Fixed so the cold-start skeleton reserves the same space (#310); the title's explicit
 * leading keeps it deterministic. */
export const PLATE_HEIGHT = 58;
export const PLATE_GAP = 16;

/** Title plate over a fit-to-fill quote in a fixed box. `onSettled` fires once the fit lands;
 * an export captured earlier is blank (#317). */
export function PosterBody({
	title,
	body,
	onSettled,
}: {
	title?: string;
	body: string;
	onSettled?: () => void;
}) {
	const boxHeight = usePosterBoxHeight();
	const shadow = useCSSVariable("--color-poster-shadow") as string;
	const fit = useFitFontSize(body);
	const settled = fit.settled;

	useEffect(() => {
		if (settled) {
			onSettled?.();
		}
	}, [settled, onSettled]);

	const bodyType = {
		fontSize: fit.fontSize,
		lineHeight: Math.round(fit.fontSize * LINE_HEIGHT_RATIO),
	};

	return (
		<View>
			{title ? (
				<View
					className="rounded-xl bg-poster-plate p-3"
					style={[styles.plate, { shadowColor: shadow }]}
				>
					<AppText
						adjustsFontSizeToFit
						className="text-center font-poster-display text-[27px] text-poster-ink leading-[34px] tracking-[1.6px]"
						minimumFontScale={0.8}
						numberOfLines={1}
					>
						{title.toUpperCase()}
					</AppText>
				</View>
			) : null}

			<View
				className={title ? "mt-4 overflow-hidden" : "overflow-hidden"}
				onLayout={fit.onBoxLayout}
				style={{ height: boxHeight }}
			>
				<AppText
					allowFontScaling
					className="font-poster-body text-poster-ink-soft"
					style={[bodyType, fit.settled ? null : styles.searching]}
				>
					{body}
				</AppText>
				{/* Unclipped twin: the capped Text only reports lines that fit.
				 * Remounted per candidate so onTextLayout re-fires. */}
				{fit.settled ? null : (
					<AppText
						className="font-poster-body"
						key={fit.measureKey}
						onTextLayout={fit.onTextLayout}
						style={[
							styles.twin,
							{ fontSize: fit.fontSize, lineHeight: bodyType.lineHeight },
						]}
					>
						{body}
					</AppText>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	plate: {
		shadowOffset: { height: 4, width: 0 },
		shadowOpacity: 0.07,
		shadowRadius: 14,
	},
	/* The first candidate is the ceiling; never paint it clipped before it settles. */
	searching: { opacity: 0 },
	twin: { left: 0, opacity: 0, position: "absolute", right: 0, top: 0 },
});
