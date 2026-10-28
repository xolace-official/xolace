import { validateDisplayName } from "@xolace/backend/convex/lib/displayName";
import { validateSpaceName } from "@xolace/backend/convex/lib/spaceName";
import { SymbolView } from "expo-symbols";
import { useThemeColor, useToast } from "heroui-native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { SettingsRow } from "@/components/shared/settings-row";
import { SettingsSection } from "@/components/shared/settings-section";
import { AppleIcon } from "@/features/auth/components/apple-icon";
import { GoogleIcon } from "@/features/auth/components/google-icon";
import { DevToolsSection } from "@/features/settings/components/dev-tools-section";
import { NameDialog } from "@/features/settings/components/name-dialog";
import {
	ACCOUNT_ICON,
	DISPLAY_NAME_ICON,
	EMAIL_ICON,
	LOG_OUT_ICON,
	SPACE_NAME_ICON,
} from "@/features/settings/components/settings-icons";
import { useAccountSettings } from "@/features/settings/hooks/use-account-settings";
import { useConfirmAction } from "@/features/settings/hooks/use-confirm-action";
import { COMPANION_FALLBACK_NAME } from "@/features/talk/talk-copy";

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

const styles = StyleSheet.create({
	contentContainer: { paddingBottom: 48, paddingTop: 20 },
});

export const AccountScreen = () => {
	const { toast } = useToast();
	const {
		signInMethod,
		spaceName,
		setSpaceName,
		displayName,
		setDisplayName,
		performLogout,
	} = useAccountSettings();
	const [spaceNameOpen, setSpaceNameOpen] = useState(false);
	const [displayNameOpen, setDisplayNameOpen] = useState(false);

	const iconColor = useThemeColor("foreground") as string;
	const mutedColor = useThemeColor("muted") as string;

	const settingIcon = (
		icon: React.ComponentProps<typeof SymbolView>["name"]
	) => <SymbolView name={icon} size={17} tintColor={mutedColor} />;

	const signInProvider = signInMethod.toLowerCase();
	const signInValueIcon = signInProvider.includes("apple") ? (
		<AppleIcon color={iconColor} size={16} />
	) : signInProvider.includes("google") ? (
		<GoogleIcon size={16} />
	) : (
		<SymbolView name={EMAIL_ICON} size={15} tintColor={mutedColor} />
	);

	const { setConfirmAction, isConfirmLoading, activeConfig, handleConfirm } =
		useConfirmAction({
			performDeleteAccount: async () => {},
			performDeleteData: async () => {},
			performLogout,
			toast,
		});

	return (
		<>
			<ScrollView
				className="flex-1 bg-background"
				contentContainerStyle={styles.contentContainer}
				contentInsetAdjustmentBehavior="automatic"
				showsVerticalScrollIndicator={false}
			>
				{/* ── SIGN-IN ──────────────────────────────────────────── */}
				<EaseView
					animate={{ opacity: 1, translateY: 0 }}
					initialAnimate={{ opacity: 0, translateY: 16 }}
					transition={{ duration: 280, easing: EASE, type: "timing" }}
				>
					<SettingsSection title="Sign-in">
						<SettingsRow
							icon={settingIcon(ACCOUNT_ICON)}
							isLast
							label="Sign-in method"
							value={signInMethod}
							valueIcon={signInValueIcon}
							variant="value"
						/>
					</SettingsSection>
				</EaseView>

				{/* ── USERNAME ─────────────────────────────────────────── */}
				<EaseView
					animate={{ opacity: 1, translateY: 0 }}
					initialAnimate={{ opacity: 0, translateY: 16 }}
					transition={{
						delay: 30,
						duration: 280,
						easing: EASE,
						type: "timing",
					}}
				>
					<SettingsSection title="Username">
						<SettingsRow
							icon={settingIcon(DISPLAY_NAME_ICON)}
							isLast
							label="Username"
							onPress={() => setDisplayNameOpen(true)}
							value={displayName ?? "—"}
							variant="value"
						/>
					</SettingsSection>
				</EaseView>

				{/* ── YOUR SPACE ───────────────────────────────────────── */}
				<EaseView
					animate={{ opacity: 1, translateY: 0 }}
					initialAnimate={{ opacity: 0, translateY: 16 }}
					transition={{
						delay: 60,
						duration: 280,
						easing: EASE,
						type: "timing",
					}}
				>
					<SettingsSection title="Your space">
						<SettingsRow
							icon={settingIcon(SPACE_NAME_ICON)}
							isLast
							label="Name"
							onPress={() => setSpaceNameOpen(true)}
							value={spaceName ?? "—"}
							variant="value"
						/>
					</SettingsSection>
				</EaseView>

				{/* ── DEV TOOLS (dev builds only) ──────────────────────── */}
				{__DEV__ && <DevToolsSection />}

				{/* ── LOG OUT ──────────────────────────────────────────── */}
				<EaseView
					animate={{ opacity: 1, translateY: 0 }}
					initialAnimate={{ opacity: 0, translateY: 16 }}
					transition={{
						delay: 120,
						duration: 280,
						easing: EASE,
						type: "timing",
					}}
				>
					<View className="px-5">
						<SettingsRow
							danger
							icon={settingIcon(LOG_OUT_ICON)}
							isLast
							label="Log out"
							onPress={() => setConfirmAction("logout")}
							variant="action"
						/>
					</View>
				</EaseView>
			</ScrollView>

			<NameDialog
				clearLabel={`Reset to ${COMPANION_FALLBACK_NAME}`}
				currentName={spaceName}
				description={`A soft label, just for you. It's also the name of your talk companion, ${COMPANION_FALLBACK_NAME} until you name it.`}
				isOpen={spaceNameOpen}
				onClear={async () => {
					await setSpaceName(null);
				}}
				onOpenChange={setSpaceNameOpen}
				onSave={async (name) => {
					await setSpaceName(name);
				}}
				placeholder="e.g. ember, haven, mine"
				title="Your space"
				validate={validateSpaceName}
			/>

			<NameDialog
				autoCapitalize="words"
				currentName={displayName}
				description="What Xolace calls you."
				fieldLabel="Username"
				isOpen={displayNameOpen}
				onOpenChange={setDisplayNameOpen}
				onSave={setDisplayName}
				placeholder="e.g. Wren"
				title="Username"
				validate={validateDisplayName}
			/>

			<ConfirmationDialog
				confirmLabel={activeConfig?.confirmLabel ?? ""}
				description={activeConfig?.description ?? ""}
				isDestructive={activeConfig?.isDestructive}
				isLoading={isConfirmLoading}
				isOpen={activeConfig !== null}
				onConfirm={handleConfirm}
				onOpenChange={(open) => {
					if (!open) {
						setConfirmAction(null);
					}
				}}
				title={activeConfig?.title ?? ""}
			/>
		</>
	);
};
