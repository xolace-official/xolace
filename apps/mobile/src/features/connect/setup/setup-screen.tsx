import {
	XOLACER_BIO_MAX_CHARS,
	XOLACER_NAME_MAX_CHARS,
} from "@xolace/backend/shared";
import { ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { BackButton } from "@/components/shared/back-button";
import { GlassButton } from "@/components/shared/glass-button";
import { Bone, Line, SkeletonBreath } from "@/components/shared/skeleton";
import { EaseView, fadeTiming } from "@/design/ease";
import { playSoftPress } from "@/lib/haptics";
import { KeyboardSpacer } from "@/lib/keyboard/keyboard-spacer";
import { SETUP } from "./copy";
import { PhotoStep } from "./photo-step";
import { useSetupScreen } from "./setup-data";
import { SetupField } from "./setup-field";
import {
	BIO_WARN_AT,
	blockingStep,
	LAST_STEP,
	SETUP_STEPS,
} from "./setup-model";
import { SetupProgress } from "./setup-progress";
import { SetupReview } from "./setup-review";
import { SpecialtyChips } from "./specialty-chips";

const CROSS = {
	animate: { opacity: 1 },
	initialAnimate: { opacity: 0 },
	transition: fadeTiming(150),
} as const;
const CLOSE = { android: "close", ios: "xmark" } as const;

export function SetupScreen() {
	const { state, actions } = useSetupScreen();
	if (state.phase !== "ready") {
		return <SetupSkeleton />;
	}
	const { draft, step, busy } = state;
	const meta = SETUP_STEPS[step] ?? SETUP_STEPS[0];
	const last = step === LAST_STEP;
	const ready = blockingStep(draft) === null;
	const off = last && (!ready || busy);
	return (
		<View className="flex-1 bg-background pt-safe-offset-2">
			<View className="px-4 pb-3">
				<BackButton
					haptic={playSoftPress}
					icon={step === 0 ? CLOSE : undefined}
					label={step === 0 ? SETUP.close : SETUP.previous}
					onPress={actions.back}
				/>
			</View>
			<SetupProgress draft={draft} step={step} />
			<ScrollView
				className="flex-1"
				contentContainerClassName="px-6 pt-7 pb-8"
				keyboardDismissMode="interactive"
				keyboardShouldPersistTaps="handled"
			>
				<EaseView key={step} {...CROSS}>
					<AppText accessibilityRole="header" variant="title">
						{meta.title}
					</AppText>
					<AppText
						className="mt-2 text-[16px] leading-[22px]"
						color="muted"
						variant="callout"
					>
						{meta.description}
					</AppText>
					<View className="mt-7">
						<StepBody />
					</View>
				</EaseView>
			</ScrollView>
			<View className="px-4 pt-2 pb-safe-or-4">
				<GlassButton
					accessibilityRole="button"
					accessibilityState={{ busy, disabled: last && !ready }}
					className="h-14 items-center justify-center rounded-[28px]"
					disabled={off}
					onPress={actions.next}
					style={{ opacity: last && !ready ? 0.4 : 1 }}
				>
					<AppText
						className="text-[17px]"
						color="background"
						variant="subhead"
						weight="semibold"
					>
						{last ? (busy ? SETUP.publishing : SETUP.publish) : SETUP.cont}
					</AppText>
				</GlassButton>
			</View>
			<KeyboardSpacer />
		</View>
	);
}

function StepBody() {
	const { state, actions } = useSetupScreen();
	if (state.phase !== "ready") {
		return null;
	}
	const { draft } = state;
	switch (SETUP_STEPS[state.step]?.id) {
		case "photo":
			return (
				<PhotoStep
					onPick={actions.pickPhoto}
					photoUrl={draft.photoUrl}
					uploading={state.uploading}
				/>
			);
		case "name":
			return (
				<SetupField
					help={SETUP.name.help}
					label={SETUP.name.label}
					max={XOLACER_NAME_MAX_CHARS}
					onChange={actions.setName}
					placeholder={SETUP.name.placeholder}
					value={draft.displayName}
				/>
			);
		case "bio":
			return (
				<SetupField
					label={SETUP.bio.label}
					max={XOLACER_BIO_MAX_CHARS}
					multiline
					onChange={actions.setBio}
					placeholder={SETUP.bio.placeholder}
					value={draft.bio}
					warnAt={BIO_WARN_AT}
				/>
			);
		case "specialties":
			return (
				<SpecialtyChips
					onToggle={actions.toggleSpecialty}
					picked={draft.specialties}
				/>
			);
		default:
			return <SetupReview draft={draft} />;
	}
}

function SetupSkeleton() {
	return (
		<View className="flex-1 bg-background pt-safe-offset-2">
			<View className="h-14" />
			<SkeletonBreath className="gap-2 px-6" label={SETUP.loading}>
				<Bone h={6} r={3} w="100%" />
				<Line lh={18} w="62%" />
				<View className="pt-7">
					<Line h={20} lh={34} w="70%" />
					<Line lh={22} w="88%" />
				</View>
				<View className="items-center pt-11">
					<Bone h={128} r={64} w={128} />
				</View>
			</SkeletonBreath>
		</View>
	);
}
