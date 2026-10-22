import { Image } from "expo-image";
import { PressableFeedback, TagGroup } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/src/components/shared/app-text";
import { PillButton } from "@/src/components/shared/pill-button";
import { CircleProgress } from "@/src/features/quotes/components/circle-progress";

const THEME_SLUGS = [
	"resilience",
	"self-compassion",
	"relationships",
	"grief-and-loss",
	"change",
	"anxiety",
	"identity",
	"loneliness",
	"healing",
	"acceptance",
	"purpose",
	"self-worth",
	"burnout",
	"hope",
	"growth",
	"fear",
	"motivation",
	"inspiration",
] as const;

const NOTIFICATION_OPTIONS = [
	{ id: "morning", label: "Morning ~8am" },
	{ id: "afternoon", label: "Afternoon ~1pm" },
	{ id: "evening", label: "Evening ~7pm" },
	{ id: "none", label: "I'll check myself" },
] as const;

const ENTRANCE = {
	duration: 350,
	easing: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
	type: "timing" as const,
};

const STEP_FADE_EASING: [number, number, number, number] = [0.4, 0, 0.6, 1];
const STEP_FADE_TRANSITION = {
	duration: 220,
	easing: STEP_FADE_EASING,
	type: "timing" as const,
};
const PROGRESS_INITIAL_ANIMATE = { opacity: 0 } as const;
const PROGRESS_ANIMATE = { opacity: 1 } as const;
const FLUX_SETUP_IMAGE_STYLE = { height: 180, width: 180 } as const;
const EMPTY_SELECTED_KEYS = new Set<string>();

type Props = {
	onComplete: (
		themes: string[],
		notificationEnabled: boolean,
		notificationTime?: string
	) => void;
	isLoading?: boolean;
};

export function PreferenceSetupSheet({ onComplete, isLoading }: Props) {
	const [step, setStep] = useState<0 | 1>(0);
	const [visible, setVisible] = useState(true);
	const [nextStep, setNextStep] = useState<0 | 1 | null>(null);

	const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set());
	const [selectedTime, setSelectedTime] = useState<string | null>(null);

	// const accentColor = useThemeColor("accent") as string;
	// const foregroundColor = useThemeColor("foreground") as string;

	const canAdvanceStep0 = selectedThemes.size >= 2 && selectedThemes.size <= 4;
	const canAdvanceStep1 = selectedTime !== null;

	const progress = step === 0 ? 0.5 : 1;
	const stepAccessibilityLabel = `Step ${step + 1} of 2`;
	const stepContentAnimate = { opacity: visible ? 1 : 0 };

	const navigateTo = (target: 0 | 1) => {
		setVisible(false);
		setNextStep(target);
	};

	const handleFadeComplete = ({ finished }: { finished: boolean }) => {
		if (finished && !visible && nextStep !== null) {
			setStep(nextStep);
			setNextStep(null);
			setVisible(true);
		}
	};

	const handleThemeToggle = (keys: Set<string | number>) => {
		const next = new Set<string>(Array.from(keys).map(String));
		const added = [...next].find((k) => !selectedThemes.has(k));
		const removed = [...selectedThemes].find((k) => !next.has(k));
		if (added) {
			Presets.ping();
		} else if (removed) {
			Presets.flick();
		}
		setSelectedThemes(next);
	};

	const handleTimeSelect = (keys: Set<string | number>) => {
		const val = Array.from(keys)[0]?.toString() ?? null;
		if (val && val !== selectedTime) {
			Presets.snap();
		}
		setSelectedTime(val);
	};

	const handleComplete = () => {
		Presets.bloom();
		const notifEnabled = selectedTime !== null && selectedTime !== "none";
		onComplete(
			Array.from(selectedThemes),
			notifEnabled,
			notifEnabled ? selectedTime! : undefined
		);
	};

	return (
		<View className="flex-1 justify-between px-6 pt-12 pb-10">
			{/* Progress indicator */}
			<View className="mb-6 items-end">
				<EaseView
					accessibilityLabel={stepAccessibilityLabel}
					animate={PROGRESS_ANIMATE}
					initialAnimate={PROGRESS_INITIAL_ANIMATE}
					transition={ENTRANCE}
				>
					<CircleProgress progress={progress} size={36} strokeWidth={4} />
				</EaseView>
			</View>

			{/* Step content */}
			<EaseView
				animate={stepContentAnimate}
				className="flex-1"
				onTransitionEnd={handleFadeComplete}
				transition={STEP_FADE_TRANSITION}
			>
				{step === 0 ? (
					<Step0
						onSelectionChange={handleThemeToggle}
						selectedThemes={selectedThemes}
					/>
				) : (
					<Step1 onTimeSelect={handleTimeSelect} selectedTime={selectedTime} />
				)}
			</EaseView>

			{/* CTA */}
			<View className="mt-8">
				{step === 0 ? (
					<>
						{canAdvanceStep0 && (
							<AppText className="mb-3 text-center text-foreground/40 text-xs">
								{selectedThemes.size} of 2–4 selected
							</AppText>
						)}
						<PillButton
							disabled={!canAdvanceStep0}
							label="Continue"
							onPress={() => navigateTo(1)}
						/>
					</>
				) : (
					<PillButton
						disabled={!canAdvanceStep1 || isLoading}
						label={isLoading ? "Setting up…" : "Done"}
						onPress={handleComplete}
					/>
				)}

				{step === 1 && (
					<PressableFeedback
						accessibilityLabel="Go back to themes"
						hitSlop={8}
						onPress={() => navigateTo(0)}
					>
						<AppText className="mt-4 text-center text-foreground/40 text-xs">
							Back
						</AppText>
					</PressableFeedback>
				)}
			</View>
		</View>
	);
}

function Step0({
	selectedThemes,
	onSelectionChange,
}: {
	selectedThemes: Set<string>;
	onSelectionChange: (keys: Set<string | number>) => void;
}) {
	return (
		<View>
			<AppText className="mb-2 font-semibold text-3xl text-foreground">
				What matters to you?
			</AppText>
			<AppText className="mb-8 text-base text-foreground/55">
				Pick 2–4 themes. Your daily quote will reflect them.
			</AppText>

			<TagGroup
				animation="disable-all"
				onSelectionChange={onSelectionChange}
				selectedKeys={selectedThemes}
				selectionMode="multiple"
				size="md"
				variant="surface"
			>
				<TagGroup.List className="flex-row flex-wrap gap-3">
					{THEME_SLUGS.map((slug) => {
						const isSelected = selectedThemes.has(slug);
						const atMax = selectedThemes.size >= 4 && !isSelected;
						return (
							<TagGroup.Item
								accessibilityLabel={`${slug}${isSelected ? ", selected" : ", unselected"}`}
								accessibilityRole="checkbox"
								id={slug}
								isDisabled={atMax}
								key={slug}
							>
								{() => (
									<TagGroup.ItemLabel
										className={
											isSelected ? "text-accent" : "text-foreground/65"
										}
									>
										{slug}
									</TagGroup.ItemLabel>
								)}
							</TagGroup.Item>
						);
					})}
				</TagGroup.List>
			</TagGroup>
		</View>
	);
}

function Step1({
	selectedTime,
	onTimeSelect,
}: {
	selectedTime: string | null;
	onTimeSelect: (keys: Set<string | number>) => void;
}) {
	const selectedTimeKeys = selectedTime
		? new Set([selectedTime])
		: EMPTY_SELECTED_KEYS;

	return (
		<View>
			<View className="mb-6 items-center">
				<Image
					contentFit="contain"
					source={require("@/assets/images/flux/flux-look-mini-bg.png")}
					style={FLUX_SETUP_IMAGE_STYLE}
				/>
			</View>

			<AppText className="mb-2 font-semibold text-3xl text-foreground">
				When should Flux reach you?
			</AppText>
			<AppText className="mb-8 text-base text-foreground/55">
				A gentle nudge when your daily quote is ready.
			</AppText>

			<TagGroup
				animation="disable-all"
				onSelectionChange={onTimeSelect}
				selectedKeys={selectedTimeKeys}
				selectionMode="single"
				size="md"
				variant="surface"
			>
				<TagGroup.List className="flex-row flex-wrap gap-3">
					{NOTIFICATION_OPTIONS.map(({ id, label }) => {
						const isSelected = selectedTime === id;
						return (
							<TagGroup.Item
								accessibilityLabel={`${label}${isSelected ? ", selected" : ""}`}
								accessibilityRole="radio"
								id={id}
								key={id}
							>
								{() => (
									<TagGroup.ItemLabel
										className={
											isSelected ? "text-accent" : "text-foreground/65"
										}
									>
										{label}
									</TagGroup.ItemLabel>
								)}
							</TagGroup.Item>
						);
					})}
				</TagGroup.List>
			</TagGroup>
		</View>
	);
}
