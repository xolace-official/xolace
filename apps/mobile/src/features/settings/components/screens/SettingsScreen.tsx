import { useUser } from "@clerk/expo";
import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/shared/app-text";
import { usePaywall } from "@/src/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/src/features/purchases/use-plus-entitlement";
import {
	ACCOUNT_ICON,
	APPEARANCE_ICON,
	type CrossPlatformSymbol,
	HEART_ICON,
	MIRROR_ICON,
	NOTIFICATIONS_ICON,
	PLUS_TIER_ICON,
	SHIELD_ICON,
	TALK_TIME_ICON,
} from "@/src/features/settings/components/settings-icons";
import { SettingsRow } from "@/src/features/settings/components/settings-row";
import { SettingsSection } from "@/src/features/settings/components/settings-section";
import {
	UpdateRow,
	useVersionLabel,
} from "@/src/features/settings/components/update-row";
import { useTalkTime } from "@/src/features/talk/use-talk-time";
import { useAppStore } from "@/src/store/store";

const styles = StyleSheet.create({
	contentContainer: { paddingBottom: 48, paddingTop: 20 },
});

export const SettingsScreen = () => {
	const router = useRouter();
	const mutedColor = useThemeColor("muted") as string;

	const preferences = useQuery(api.preferences.get);
	const { user } = useUser();
	const { isPlus } = usePlusEntitlement();
	const talkTime = useTalkTime(isPlus);
	const openPaywall = usePaywall((s) => s.open);
	const storedTheme = useAppStore((s) => s.theme);

	const themeDisplay =
		storedTheme === "system"
			? "System"
			: storedTheme === "light"
				? "Light"
				: "Dark";

	const mirrorToneDisplay = preferences
		? preferences.mirrorTone.charAt(0).toUpperCase() +
			preferences.mirrorTone.slice(1)
		: "—";

	const notificationsDisplay = preferences
		? preferences.notifications?.enabled
			? "On"
			: "Off"
		: "—";

	const signInMethod = (() => {
		if (!user) {
			return "—";
		}
		const ext = user.externalAccounts?.[0];
		if (!ext) {
			return "Email";
		}
		const provider = (ext.provider ?? "").toLowerCase();
		if (provider.includes("apple")) {
			return "Apple";
		}
		if (provider.includes("google")) {
			return "Google";
		}
		return "Email";
	})();

	const versionLabel = useVersionLabel();

	const icon = (name: CrossPlatformSymbol) => (
		<SymbolView name={name} size={17} tintColor={mutedColor} />
	);

	return (
		<ScrollView
			contentContainerStyle={styles.contentContainer}
			contentInsetAdjustmentBehavior="automatic"
			showsVerticalScrollIndicator={false}
		>
			{/* ── XOLACE+ ─────────────────────────────────────────── */}
			<SettingsSection title="Xolace+">
				{isPlus ? (
					<>
						<SettingsRow
							icon={icon(PLUS_TIER_ICON)}
							label="Xolace+"
							value="Active"
							variant="value"
						/>
						<SettingsRow
							icon={icon(TALK_TIME_ICON)}
							isLast
							label="Talk time this week"
							value={
								talkTime
									? `${Math.floor(talkTime.secondsLeft / 60)} min left`
									: "—"
							}
							variant="value"
						/>
					</>
				) : (
					<SettingsRow
						icon={icon(PLUS_TIER_ICON)}
						isLast
						label="Xolace+"
						onPress={() => openPaywall("settings_row")}
						variant="nav"
					/>
				)}
			</SettingsSection>

			{/* ── PREFERENCES ─────────────────────────────────────── */}
			<SettingsSection title="Preferences">
				<SettingsRow
					icon={icon(APPEARANCE_ICON)}
					label="Appearance"
					onPress={() => router.push("/(protected)/settings/appearance")}
					value={themeDisplay}
					variant="nav"
				/>
				<SettingsRow
					icon={icon(MIRROR_ICON)}
					label="Mirror"
					onPress={() => router.push("/(protected)/settings/mirror")}
					value={mirrorToneDisplay}
					variant="nav"
				/>
				<SettingsRow
					icon={icon(NOTIFICATIONS_ICON)}
					isLast
					label="Notifications"
					onPress={() => router.push("/(protected)/settings/notifications")}
					value={notificationsDisplay}
					variant="nav"
				/>
			</SettingsSection>

			{/* ── PERSONAL ────────────────────────────────────────── */}
			<SettingsSection title="Personal">
				<SettingsRow
					icon={icon(SHIELD_ICON)}
					label="Privacy & Data"
					onPress={() => router.push("/(protected)/settings/data")}
					variant="nav"
				/>
				<SettingsRow
					icon={icon(ACCOUNT_ICON)}
					label="Account"
					onPress={() => router.push("/(protected)/settings/account")}
					value={signInMethod}
					variant="nav"
				/>
				<SettingsRow
					icon={icon(HEART_ICON)}
					label="Follow & Support"
					onPress={() => router.push("/(protected)/settings/follow")}
					variant="nav"
				/>
				<UpdateRow isLast />
			</SettingsSection>

			{/* ── VERSION FOOTER ──────────────────────────────────── */}
			<View className="items-center gap-1 pt-8">
				<AppText
					className="font-semibold text-foreground/20 text-sm tracking-widest"
					selectable
				>
					Xolace
				</AppText>
				<AppText className="text-foreground/20 text-xs" selectable>
					{versionLabel}
				</AppText>
			</View>
		</ScrollView>
	);
};
