import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
	Button,
	PressableFeedback,
	Skeleton,
	useThemeColor,
	useToast,
} from "heroui-native";
import { Activity } from "react";
import { ScrollView, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { playSoftPress } from "@/lib/haptics";
import { PhotoStep } from "./photo-step";
import { ReviewStep } from "./review-step";
import { SetupProgress } from "./setup-progress";
import { SpecialtyPicker } from "./specialty-picker";
import { firstIncompleteStep, SETUP_STEPS, type SetupDraft } from "./steps";
import { BioStep, NameStep } from "./text-steps";
import { useXolacerSetup } from "./use-xolacer-setup";

const FADE = { duration: 150, type: "timing" as const };
const CLOSE_ICON = { android: "close", ios: "xmark", web: "close" } as const;

export function XolacerSetupScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { toast } = useToast();
	const foreground = useThemeColor("foreground") as string;
	const setup = useXolacerSetup();

	const { draft, index, visible } = setup;
	const step = SETUP_STEPS[index];
	const blocking = firstIncompleteStep(draft);
	const isLastStep = index === SETUP_STEPS.length - 1;

	const handleAdvance = () => {
		playSoftPress();
		const save = setup.saveText();

		if (!isLastStep) {
			setup.goToStep(index + 1);
			save.catch(() =>
				toast.show({ label: "Couldn't save that. Check your connection." })
			);
			return;
		}

		save
			.then(() => setup.publish())
			.then(() => {
				toast.show({ label: "You're on the roster." });
				router.back();
			})
			.catch(() =>
				toast.show({ label: "Couldn't publish yet — something's missing." })
			);
	};

	if (setup.loading) {
		return <SetupSkeleton />;
	}

	return (
		<View
			className="flex-1 bg-background"
			style={{ paddingTop: insets.top + 6 }}
		>
			<View className="flex-row items-center gap-2 px-4 pb-1">
				<PressableFeedback
					accessibilityLabel={index === 0 ? "Close" : "Previous step"}
					accessibilityRole="button"
					hitSlop={10}
					onPress={() => {
						playSoftPress();
						if (index === 0) {
							router.back();
						} else {
							setup.goToStep(index - 1);
						}
					}}
				>
					<SymbolView
						name={
							index === 0
								? CLOSE_ICON
								: {
										android: "arrow_back",
										ios: "chevron.left",
										web: "arrow_back",
									}
						}
						size={20}
						tintColor={foreground}
					/>
				</PressableFeedback>
			</View>

			<View className="px-5 pb-1">
				<SetupProgress blockingLabel={blocking?.missingLabel} draft={draft} />
			</View>

			<ScrollView
				className="flex-1"
				contentContainerClassName="px-5 pt-3 pb-6"
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<EaseView
					animate={{ opacity: visible ? 1 : 0 }}
					onTransitionEnd={setup.handleFadeComplete}
					transition={FADE}
				>
					<AppText className="font-semibold text-2xl text-foreground">
						{step.title}
					</AppText>
					<AppText className="mt-1 text-[13px] text-muted leading-5">
						{step.description}
					</AppText>
					<StepBodies setup={setup} />
				</EaseView>
			</ScrollView>

			<View
				className="border-border/40 border-t px-5 pt-3"
				style={{ paddingBottom: Math.max(insets.bottom, 16) }}
			>
				<Button
					isDisabled={isLastStep && blocking !== null}
					onPress={handleAdvance}
				>
					{isLastStep ? "Publish profile" : "Continue"}
				</Button>
			</View>
		</View>
	);
}

/**
 * Every step stays mounted inside an `Activity`; only the current one is
 * visible. Hidden steps keep their input state and cursor position, so moving
 * back and forth never costs a xolacer what they already typed.
 */
function StepBodies({ setup }: { setup: ReturnType<typeof useXolacerSetup> }) {
	const { draft, index, setField } = setup;

	return (
		<>
			{SETUP_STEPS.map((step, stepIndex) => (
				<Activity
					key={step.id}
					mode={stepIndex === index ? "visible" : "hidden"}
				>
					<StepBody
						draft={draft}
						id={step.id}
						setField={setField}
						setup={setup}
					/>
				</Activity>
			))}
		</>
	);
}

function StepBody({
	id,
	draft,
	setup,
	setField,
}: {
	id: (typeof SETUP_STEPS)[number]["id"];
	draft: SetupDraft;
	setup: ReturnType<typeof useXolacerSetup>;
	setField: (key: "displayName" | "bio", value: string) => void;
}) {
	if (id === "photo") {
		return (
			<PhotoStep
				onPick={setup.pickPhoto}
				photoUrl={draft.photoUrl}
				uploading={setup.uploading}
			/>
		);
	}
	if (id === "name") {
		return (
			<NameStep
				onChange={(next) => setField("displayName", next)}
				value={draft.displayName}
			/>
		);
	}
	if (id === "bio") {
		return (
			<BioStep onChange={(next) => setField("bio", next)} value={draft.bio} />
		);
	}
	if (id === "specialties") {
		return (
			<SpecialtyPicker
				onToggle={setup.toggleSpecialty}
				selected={draft.specialties}
			/>
		);
	}
	return <ReviewStep draft={draft} />;
}

function SetupSkeleton() {
	return (
		<View className="flex-1 gap-4 bg-background px-5 pt-24">
			<Skeleton className="h-2 w-full rounded-full" />
			<Skeleton className="h-8 w-3/5 rounded-lg" />
			<Skeleton className="h-4 w-4/5 rounded-lg" />
			<Skeleton className="h-32 w-32 self-center rounded-full" />
		</View>
	);
}
