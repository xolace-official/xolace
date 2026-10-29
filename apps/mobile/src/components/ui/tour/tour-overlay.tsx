import { useState } from "react";
import {
	type LayoutChangeEvent,
	StyleSheet,
	useWindowDimensions,
	View,
} from "react-native";

import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { cardFrame } from "@/components/ui/tour/geometry";
import { TourBackdrop } from "@/components/ui/tour/tour-backdrop";
import { TourCard } from "@/components/ui/tour/tour-card";
import type {
	TourLabels,
	TourPlacement,
	TourShape,
	TourStepEntry,
} from "@/components/ui/tour/types";
import { useSpotlight } from "@/components/ui/tour/use-spotlight";

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
	active: TourStepEntry | undefined;
	index: number;
	total: number;
	isFirst: boolean;
	isLast: boolean;
	padding: number;
	radius: number;
	shape: TourShape;
	placement: TourPlacement;
	dismissible: boolean;
	showProgress: boolean;
	showSkip: boolean;
	interactive: boolean;
	overlayColor: string;
	reducedMotion: boolean;
	words: Required<TourLabels>;
	cardClassName?: string;
	onNext: () => void;
	onBack: () => void;
	onSkip: () => void;
};

export const TourOverlay = ({
	active,
	index,
	total,
	isFirst,
	isLast,
	padding,
	radius,
	shape,
	placement,
	dismissible,
	showProgress,
	showSkip,
	interactive,
	overlayColor,
	reducedMotion,
	words,
	cardClassName,
	onNext,
	onBack,
	onSkip,
}: Props) => {
	const { width: screenWidth, height: screenHeight } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const { hole, spot, pathProps } = useSpotlight({
		active,
		padding: active?.padding ?? padding,
		radius: active?.radius ?? radius,
		reducedMotion,
		screenHeight,
		screenWidth,
		shape: active?.shape ?? shape,
	});

	const [cardHeight, setCardHeight] = useState<number | null>(null);

	// The card remounts per step but its height lives here; reset during render so the
	// next step is not placed by the previous card's height for a frame.
	const [measuredOrder, setMeasuredOrder] = useState(active?.order);
	if (measuredOrder !== active?.order) {
		setMeasuredOrder(active?.order);
		setCardHeight(null);
	}

	// A step with no measurable target gets no hole and a card in the middle of the screen.
	const card = cardFrame({
		cardHeight,
		insets,
		placement: active?.placement ?? placement,
		screenHeight,
		screenWidth,
		spot,
	});

	const onCardLayout = (event: LayoutChangeEvent) => {
		const measured = event.nativeEvent.layout.height;
		setCardHeight((current) =>
			current !== null && Math.abs(current - measured) < 1 ? current : measured
		);
	};

	return (
		<View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
			{/* The dim takes no touches; the backdrop under it is one responder, or four around
			    a usable target. */}
			<TourBackdrop
				dismissible={dismissible}
				interactive={interactive}
				onDismiss={onSkip}
				screenHeight={screenHeight}
				screenWidth={screenWidth}
				spot={hole}
			/>

			<Animated.View
				entering={reducedMotion ? undefined : FadeIn.duration(180)}
				exiting={reducedMotion ? undefined : FadeOut.duration(140)}
				pointerEvents="none"
				style={StyleSheet.absoluteFill}
			>
				<Svg height={screenHeight} width={screenWidth}>
					<AnimatedPath
						animatedProps={pathProps}
						fill={overlayColor}
						fillRule="evenodd"
					/>
				</Svg>
			</Animated.View>

			{/* Two views on purpose: the entering animation and the measurement gate both drive
			    opacity and would fight on one view. Outer owns placement; the card owns the
			    gate. */}
			<Animated.View
				entering={reducedMotion ? undefined : FadeIn.duration(200)}
				key={active?.order ?? "none"}
				style={[
					styles.cardPosition,
					{ left: card.left, top: card.top, width: card.width },
				]}
			>
				<TourCard
					active={active}
					className={cardClassName}
					dismissible={dismissible}
					index={index}
					isFirst={isFirst}
					isLast={isLast}
					measured={cardHeight !== null}
					onBack={onBack}
					onLayout={onCardLayout}
					onNext={onNext}
					onSkip={onSkip}
					showProgress={showProgress}
					showSkip={showSkip}
					total={total}
					words={words}
				/>
			</Animated.View>
		</View>
	);
};

const styles = StyleSheet.create({
	cardPosition: { position: "absolute" },
});
