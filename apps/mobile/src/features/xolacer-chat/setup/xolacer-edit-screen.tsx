import CheckIcon from "@expo/material-symbols/check.xml";
import CloseIcon from "@expo/material-symbols/close.xml";
import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
	Skeleton,
	Surface,
	Switch,
	useThemeColor,
	useToast,
} from "heroui-native";
import { useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { AppText } from "@/components/shared/app-text";
import { playSoftPress } from "@/lib/haptics";
import { PhotoStep } from "./photo-step";
import { SpecialtyPicker } from "./specialty-picker";
import { firstIncompleteStep } from "./steps";
import { BioStep, NameStep } from "./text-steps";
import { useXolacerSetup } from "./use-xolacer-setup";

const styles = StyleSheet.create({
	borderCurve: { borderCurve: "continuous" },
});

const SCREEN_OPTIONS = { headerShown: true, title: "Edit profile" } as const;

const ICON = {
	active: {
		android: "sensors",
		ios: "dot.radiowaves.left.and.right",
		web: "sensors",
	},
	paused: { android: "bedtime", ios: "moon.zzz.fill", web: "bedtime" },
} as const;

/** Edits a published profile on one page, sharing the setup flow's draft. The photo and the
 * listed switch write immediately and say so, since Cancel cannot undo them. */
export function XolacerEditScreen() {
	const router = useRouter();
	const { toast } = useToast();
	const accent = useThemeColor("accent") as string;
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
				toast.show({ label: "Profile updated." });
				router.back();
			})
			// Left open on failure, edits intact — a dropped connection shouldn't
			// cost someone the bio they just rewrote.
			.catch((error: unknown) => {
				console.error("[xolacer-edit] save failed", error);
				toast.show({ label: "Couldn't save that. Check your connection." });
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
					contentContainerClassName="px-5 pb-10 gap-2"
					contentInsetAdjustmentBehavior="automatic"
					keyboardDismissMode="interactive"
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<PhotoStep
						onPick={setup.pickPhoto}
						photoUrl={draft.photoUrl}
						uploading={setup.uploading}
					/>
					<AppText className="pb-1 text-center text-[11px] text-muted">
						A new photo replaces the old one straight away.
					</AppText>
					<NameStep
						onChange={(next) => setup.setField("displayName", next)}
						value={draft.displayName}
					/>
					<BioStep
						onChange={(next) => setup.setField("bio", next)}
						value={draft.bio}
					/>
					<SpecialtyPicker
						onToggle={setup.toggleSpecialty}
						selected={draft.specialties}
					/>
					<ListedToggle active={setup.active} onChange={setup.setActive} />

					{blocking && (
						<AppText className="px-0.5 pt-1 text-[11px] text-warning">
							Your profile is live — {blocking.missingLabel} before saving.
						</AppText>
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
			<AppText className="font-semibold text-[15px] text-foreground">
				No profile to edit
			</AppText>
			<AppText className="text-center text-[13px] text-muted leading-5">
				There&apos;s no Xolacer profile on this account right now.
			</AppText>
		</View>
	);
}

/** Immediate, like the card on Connect it replaced — and it says so. */
function ListedToggle({
	active,
	onChange,
}: {
	active: boolean;
	onChange: (next: boolean) => void;
}) {
	const accent = useThemeColor("accent") as string;
	const muted = useThemeColor("muted") as string;

	return (
		<Surface
			className="mt-4 flex-row items-center gap-3 p-4"
			style={styles.borderCurve}
		>
			<SymbolView
				name={active ? ICON.active : ICON.paused}
				size={18}
				tintColor={active ? accent : muted}
			/>
			<View className="flex-1">
				<AppText className="font-semibold text-foreground text-sm">
					{active ? "You're listed" : "You're paused"}
				</AppText>
				<AppText className="mt-0.5 text-muted text-xs leading-4">
					{active
						? "People can find you and send requests. Takes effect right away."
						: "You're off the roster. Chats you already have still work."}
				</AppText>
			</View>
			<Switch
				accessibilityLabel="Available for new conversations"
				isSelected={active}
				onSelectedChange={(next) => {
					Keyboard.dismiss();
					playSoftPress();
					onChange(next);
				}}
			>
				<Switch.Thumb />
			</Switch>
		</Surface>
	);
}

function EditSkeleton() {
	return (
		<View className="flex-1 gap-4 bg-background px-5 pt-6">
			<Skeleton className="h-32 w-32 self-center rounded-full" />
			<Skeleton className="h-12 w-full rounded-2xl" />
			<Skeleton className="h-24 w-full rounded-2xl" />
			<Skeleton className="h-20 w-full rounded-3xl" />
		</View>
	);
}
