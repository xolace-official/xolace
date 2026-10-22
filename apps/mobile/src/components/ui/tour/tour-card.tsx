import { SymbolView } from "expo-symbols";
import { Button, CloseButton, useThemeColor } from "heroui-native";
import { type LayoutChangeEvent, View } from "react-native";

import { AppText } from "@/src/components/shared/app-text";
import type { TourLabels, TourStepEntry } from "@/src/components/ui/tour/types";
import { cn } from "@/src/lib/utils";

const CHEVRON_LEFT_NAME = {
	android: "chevron_left",
	ios: "chevron.left",
	web: "chevron_left",
} as const;

type Props = {
	active: TourStepEntry | undefined;
	index: number;
	total: number;
	isFirst: boolean;
	isLast: boolean;
	/** Held at zero opacity until the card has been measured once. */
	measured: boolean;
	dismissible: boolean;
	showProgress: boolean;
	showSkip: boolean;
	words: Required<TourLabels>;
	className?: string;
	onLayout: (event: LayoutChangeEvent) => void;
	onNext: () => void;
	onBack: () => void;
	onSkip: () => void;
};

/** The panel beside the spotlight: what this step is, and how to leave it. */
export const TourCard = ({
	active,
	index,
	total,
	isFirst,
	isLast,
	measured,
	dismissible,
	showProgress,
	showSkip,
	words,
	className,
	onLayout,
	onNext,
	onBack,
	onSkip,
}: Props) => {
	const defaultForeground = useThemeColor("default-foreground");

	return (
		<View
			accessibilityLiveRegion="polite"
			accessibilityViewIsModal
			// Held off the first frame's opacity rather than off the screen: the
			// card has to be laid out to be measured, and its height is what decides
			// whether it goes above the target or below it.
			className={cn(
				"gap-3 rounded-2xl border border-border bg-overlay p-4",
				measured ? "opacity-100" : "opacity-0",
				className
			)}
			onLayout={onLayout}
		>
			{dismissible && (
				<CloseButton
					accessibilityLabel={words.close}
					className="absolute end-1 top-1"
					onPress={onSkip}
				/>
			)}

			<View className="gap-1 pe-8">
				{showProgress && total > 1 && index >= 0 && (
					<AppText
						accessibilityLabel={`Step ${index + 1} of ${total}`}
						className="text-overlay-foreground/60 text-xs"
					>
						{`${index + 1} of ${total}`}
					</AppText>
				)}
				{active?.title && (
					<AppText
						accessibilityRole="header"
						className="font-semibold text-overlay-foreground"
					>
						{active.title}
					</AppText>
				)}
				{active?.description && (
					<AppText className="text-overlay-foreground/70 text-sm">
						{active.description}
					</AppText>
				)}
			</View>

			<View className="flex-row items-center justify-between gap-2">
				<View className="flex-row items-center gap-1">
					{showSkip && !isLast && (
						<Button onPress={onSkip} size="sm" variant="ghost">
							<Button.Label>{words.skip}</Button.Label>
						</Button>
					)}
				</View>

				<View className="flex-row items-center gap-2">
					{!isFirst && (
						<Button
							className="gap-1"
							onPress={onBack}
							size="sm"
							variant="tertiary"
						>
							<SymbolView
								name={CHEVRON_LEFT_NAME}
								size={13}
								tintColor={defaultForeground}
							/>
							<Button.Label>{words.back}</Button.Label>
						</Button>
					)}
					<Button onPress={onNext} size="sm" variant="primary">
						<Button.Label>{isLast ? words.done : words.next}</Button.Label>
					</Button>
				</View>
			</View>
		</View>
	);
};
