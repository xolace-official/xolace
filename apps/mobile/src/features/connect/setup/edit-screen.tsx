import CheckIcon from "@expo/material-symbols/check.xml";
import CloseIcon from "@expo/material-symbols/close.xml";
import { Stack } from "expo-router";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Footnote, SettingsCard } from "@/components/settings-kit/parts";
import { SwitchRow } from "@/components/settings-kit/switch-row";
import { AppText } from "@/components/shared/app-text";
import { EmptyState } from "@/components/shared/empty-state";
import { Bone, SkeletonBreath } from "@/components/shared/skeleton";
import { useTokenColor } from "@/lib/use-token-color";
import { SETUP } from "./copy";
import { PhotoStep } from "./photo-step";
import { useSetupScreen } from "./setup-data";
import { SetupField } from "./setup-field";
import {
	BIO_MAX_LENGTH,
	BIO_WARN_AT,
	blockingStep,
	NAME_MAX_LENGTH,
} from "./setup-model";
import { SpecialtyChips } from "./specialty-chips";

const IOS = process.env.EXPO_OS === "ios";
/** Clears the bio's count so it never hides behind the keyboard. */
const KEYBOARD_OFFSET = 140;

/**
 * Edit a published profile on one page, with setup's field, chips and photo. The photo and the
 * listed switch write straight away and say so, since Cancel can't undo them.
 */
export function EditScreen() {
	const { state, actions } = useSetupScreen();
	const accent = useTokenColor("accent");
	const ready = state.phase === "ready";
	const blocking = ready ? blockingStep(state.draft) : null;
	const savable = ready && blocking === null && !state.busy;
	return (
		<>
			<Stack.Screen options={{ headerShown: true, title: SETUP.edit.title }} />
			<Stack.Toolbar placement="left">
				<Stack.Toolbar.Button
					accessibilityLabel={SETUP.close}
					icon={IOS ? undefined : CloseIcon}
					onPress={actions.close}
					variant="plain"
				>
					{SETUP.edit.cancel}
				</Stack.Toolbar.Button>
			</Stack.Toolbar>
			<Stack.Toolbar placement="right">
				<Stack.Toolbar.Button
					accessibilityLabel={SETUP.edit.saveA11y}
					disabled={!savable}
					icon={IOS ? undefined : CheckIcon}
					onPress={actions.save}
					tintColor={accent}
					variant="prominent"
				>
					{ready && state.busy ? SETUP.edit.saving : SETUP.edit.save}
				</Stack.Toolbar.Button>
			</Stack.Toolbar>
			{state.phase === "loading" ? <EditSkeleton /> : null}
			{state.phase === "missing" ? (
				<View className="flex-1 justify-center bg-background">
					<EmptyState body={SETUP.edit.goneBody} title={SETUP.edit.goneTitle} />
				</View>
			) : null}
			{state.phase === "ready" ? (
				<KeyboardAwareScrollView
					bottomOffset={KEYBOARD_OFFSET}
					className="flex-1 bg-background"
					contentContainerClassName="gap-section px-4 pb-10"
					contentInsetAdjustmentBehavior="automatic"
					keyboardDismissMode="interactive"
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<PhotoStep
						note={SETUP.edit.photoNow}
						onPick={actions.pickPhoto}
						photoUrl={state.draft.photoUrl}
						uploading={state.uploading}
					/>
					<SetupField
						help={SETUP.name.help}
						label={SETUP.name.label}
						max={NAME_MAX_LENGTH}
						onChange={actions.setName}
						placeholder={SETUP.name.placeholder}
						value={state.draft.displayName}
					/>
					<SetupField
						label={SETUP.bio.label}
						max={BIO_MAX_LENGTH}
						multiline
						onChange={actions.setBio}
						placeholder={SETUP.bio.placeholder}
						value={state.draft.bio}
						warnAt={BIO_WARN_AT}
					/>
					<View>
						<AppText
							className="mb-2.5 text-[13px] text-foreground/62 leading-[17px]"
							weight="semibold"
						>
							{SETUP.edit.specialties}
						</AppText>
						<SpecialtyChips
							onToggle={actions.toggleSpecialty}
							picked={state.draft.specialties}
						/>
					</View>
					<View className="-mx-4">
						<SettingsCard>
							<SwitchRow
								a11y={SETUP.edit.activeA11y}
								label={state.active ? SETUP.edit.active : SETUP.edit.paused}
								onChange={actions.setActive}
								value={state.active}
							/>
						</SettingsCard>
						<Footnote>
							{state.active ? SETUP.edit.activeFoot : SETUP.edit.pausedFoot}
						</Footnote>
						{blocking ? (
							<Footnote className="text-ember-ink">
								{SETUP.edit.gap(blocking.missing)}
							</Footnote>
						) : null}
					</View>
				</KeyboardAwareScrollView>
			) : null}
		</>
	);
}

/** The page's shape while the profile loads: the photo, then the fields. */
function EditSkeleton() {
	return (
		<View className="flex-1 bg-background pt-safe-offset-16">
			<SkeletonBreath
				className="gap-section px-4 pt-4"
				label={SETUP.edit.loading}
			>
				<View className="items-center">
					<Bone h={128} r={64} w={128} />
				</View>
				<Bone h={46} r={13} w="100%" />
				<Bone h={124} r={13} w="100%" />
			</SkeletonBreath>
		</View>
	);
}
