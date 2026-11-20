import CheckIcon from "@expo/material-symbols/check.xml";
import CloseIcon from "@expo/material-symbols/close.xml";
import { Stack, useRouter } from "expo-router";
import { Skeleton } from "heroui-native";
import { useState } from "react";
import { Keyboard, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Footnote, SettingsCard } from "@/components/settings-kit/parts";
import { SwitchRow } from "@/components/settings-kit/switch-row";
import { AppText } from "@/components/shared/app-text";
import { toast } from "@/components/shared/toast";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";
import { BioCard, EditPhoto, NameCard } from "./edit-fields";
import { SpecialtyChips } from "./specialty-chips";
import { firstIncompleteStep } from "./steps";
import { useXolacerSetup } from "./use-xolacer-setup";

const SCREEN_OPTIONS = { headerShown: true, title: "Edit profile" } as const;

/** Edits a published profile on one page, sharing the setup flow's draft. The photo and the
 * listed switch write immediately and say so, since Cancel cannot undo them. */
export function XolacerEditScreen() {
	const router = useRouter();
	const accent = useTokenColor("accent");
	const setup = useXolacerSetup();
	const [saving, setSaving] = useState(false);

	const { draft } = setup;
	const blocking = firstIncompleteStep(draft);
	const savable = blocking === null && !saving && !setup.missing;

	const close = () => {
		Keyboard.dismiss();
		playSoftPress();
		router.back();
	};

	const handleSave = () => {
		if (!savable) {
			return;
		}
		Keyboard.dismiss();
		playSoftPress();
		setSaving(true);
		setup
			.saveText()
			.then(() => {
				toast("Profile updated.");
				router.back();
			})
			// Left open on failure, edits intact — a dropped connection shouldn't
			// cost someone the bio they just rewrote.
			.catch((error: unknown) => {
				console.error("[xolacer-edit] save failed", error);
				toast("Couldn't save that. Check your connection.");
			})
			.finally(() => setSaving(false));
	};

	return (
		<>
			<Stack.Screen options={SCREEN_OPTIONS} />
			<Stack.Toolbar placement="left">
				<Stack.Toolbar.Button
					accessibilityLabel="Close"
					icon={process.env.EXPO_OS === "ios" ? undefined : CloseIcon}
					onPress={close}
					variant="plain"
				>
					Cancel
				</Stack.Toolbar.Button>
			</Stack.Toolbar>
			<Stack.Toolbar placement="right">
				<Stack.Toolbar.Button
					accessibilityLabel="Save profile"
					disabled={!savable}
					icon={process.env.EXPO_OS === "ios" ? undefined : CheckIcon}
					onPress={handleSave}
					tintColor={accent}
					variant="prominent"
				>
					{saving ? "Saving…" : "Save"}
				</Stack.Toolbar.Button>
			</Stack.Toolbar>

			{setup.loading ? (
				<EditSkeleton />
			) : setup.missing ? (
				<Unavailable />
			) : (
				<KeyboardAwareScrollView
					// Clears the bio's character counter so its feedback never hides behind the
					// keyboard.
					bottomOffset={140}
					className="flex-1 bg-background"
					contentContainerClassName="pb-10"
					contentInsetAdjustmentBehavior="automatic"
					keyboardDismissMode="interactive"
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<EditPhoto
						onPick={setup.pickPhoto}
						photoUrl={draft.photoUrl}
						uploading={setup.uploading}
					/>
					<NameCard
						onChange={(next) => setup.setField("displayName", next)}
						value={draft.displayName}
					/>
					<BioCard
						onChange={(next) => setup.setField("bio", next)}
						value={draft.bio}
					/>
					<SpecialtyChips
						onToggle={setup.toggleSpecialty}
						selected={draft.specialties}
					/>
					<ListedToggle active={setup.active} onChange={setup.setActive} />

					{blocking && (
						<Footnote className="text-warning">
							Your profile is live — {blocking.missingLabel} before saving.
						</Footnote>
					)}
				</KeyboardAwareScrollView>
			)}
		</>
	);
}

/** Reachable by deep link; the profile can stop existing between open and render (chat off,
 * status revoked). */
function Unavailable() {
	return (
		<View className="flex-1 items-center justify-center gap-2 bg-background px-10">
			<AppText accessibilityRole="header" center variant="headline">
				No profile to edit
			</AppText>
			<AppText center color="muted" variant="footnote">
				There&apos;s no Xolacer profile on this account right now.
			</AppText>
		</View>
	);
}

/** Immediate, like the card on Connect it replaced — and the footnote says so. */
function ListedToggle({
	active,
	onChange,
}: {
	active: boolean;
	onChange: (next: boolean) => void;
}) {
	return (
		<View className="mt-section">
			<SettingsCard>
				<SwitchRow
					a11y="Available for new conversations"
					label={active ? "You're listed" : "You're paused"}
					onChange={(next) => {
						Keyboard.dismiss();
						playSoftPress();
						onChange(next);
					}}
					value={active}
				/>
			</SettingsCard>
			<Footnote>
				{active
					? "People can find you and send requests. Takes effect right away."
					: "You're off the roster. Chats you already have still work."}
			</Footnote>
		</View>
	);
}

/** The page's shape while the profile loads: the photo, then the cards. */
function EditSkeleton() {
	return (
		<View className="flex-1 gap-section bg-background pt-6">
			<Skeleton className="size-28 self-center rounded-full" />
			<Skeleton className="mx-4 h-13 rounded-[22px]" />
			<Skeleton className="mx-4 h-26 rounded-[22px]" />
			<Skeleton className="mx-4 h-13 rounded-[22px]" />
		</View>
	);
}
