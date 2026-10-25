import { SymbolView } from "expo-symbols";
import { RadioGroup, useThemeColor, useToast } from "heroui-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";
import { ConfirmationDialog } from "@/src/components/shared/confirmation-dialog";
import { RadioIconIndicator } from "@/src/features/settings/components/radio-icon-indicator";
import {
	type CrossPlatformSymbol,
	DELETE_ACCOUNT_ICON,
	DELETE_DATA_ICON,
	MEMORY_ICON,
	SHARE_ICON,
} from "@/src/features/settings/components/settings-icons";
import { SettingsRow } from "@/src/features/settings/components/settings-row";
import { SettingsSection } from "@/src/features/settings/components/settings-section";
import { useConfirmAction } from "@/src/features/settings/hooks/use-confirm-action";
import {
	type RetentionOption,
	useDataSettings,
} from "@/src/features/settings/hooks/use-data-settings";
import { cn } from "@/src/lib/utils";

const RETENTION_OPTIONS: {
	value: RetentionOption;
	label: string;
	description: string;
	symbol: CrossPlatformSymbol;
}[] = [
	{
		description: "Keep my data until I delete it",
		label: "Indefinite",
		symbol: { android: "all_inclusive", ios: "infinity", web: "all_inclusive" },
		value: "indefinite",
	},
	{
		description: "Auto-delete sessions older than 1 year",
		label: "1 year",
		symbol: {
			android: "calendar_month",
			ios: "calendar",
			web: "calendar_month",
		},
		value: "1_year",
	},
	{
		description: "Auto-delete sessions older than 6 months",
		label: "6 months",
		symbol: {
			android: "event_repeat",
			ios: "calendar.badge.clock",
			web: "event_repeat",
		},
		value: "6_months",
	},
];

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

const styles = StyleSheet.create({
	contentContainer: { paddingBottom: 48, paddingTop: 20 },
});

export const DataScreen = () => {
	const { toast } = useToast();
	const {
		contributeAnonymously,
		setContributeAnonymously,
		personalMemory,
		setPersonalMemory,
		retention,
		setRetention,
		performDeleteData,
		performDeleteAccount,
	} = useDataSettings();

	const mutedColor = useThemeColor("muted") as string;

	const settingIcon = (
		icon: React.ComponentProps<typeof SymbolView>["name"]
	) => <SymbolView name={icon} size={17} tintColor={mutedColor} />;

	const { setConfirmAction, isConfirmLoading, activeConfig, handleConfirm } =
		useConfirmAction({
			performDeleteAccount,
			performDeleteData,
			performLogout: async () => {},
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
				{/* ── SHARING ──────────────────────────────────────────── */}
				<EaseView
					animate={{ opacity: 1, translateY: 0 }}
					initialAnimate={{ opacity: 0, translateY: 16 }}
					transition={{ duration: 280, easing: EASE, type: "timing" }}
				>
					<SettingsSection title="Sharing">
						<SettingsRow
							icon={settingIcon(SHARE_ICON)}
							isLast
							isSelected={contributeAnonymously}
							label="Share by default"
							onToggle={setContributeAnonymously}
							variant="toggle"
						/>
					</SettingsSection>
				</EaseView>

				{/* ── MEMORY ───────────────────────────────────────────── */}
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
					<SettingsSection title="Memory">
						<SettingsRow
							icon={settingIcon(MEMORY_ICON)}
							isLast
							isSelected={personalMemory}
							label="Personal memory"
							onToggle={setPersonalMemory}
							variant="toggle"
						/>
						<AppText className="px-5 pt-2 text-foreground/55 text-sm">
							The fire remembers what you&apos;ve shared with it, that&apos;s
							how it knows you. Turn this off and new reflections are kept
							without their words.
						</AppText>
					</SettingsSection>
				</EaseView>

				{/* ── RETENTION ────────────────────────────────────────── */}
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
					<SettingsSection title="Retention">
						<View className="px-5">
							<RadioGroup
								className="gap-2"
								onValueChange={(v) => setRetention(v as RetentionOption)}
								value={retention}
							>
								{RETENTION_OPTIONS.map((opt) => (
									<RadioGroup.Item key={opt.value} value={opt.value}>
										{({ isSelected }) => (
											<View
												className={cn(
													"flex-row items-center gap-4 rounded-2xl px-4 py-4",
													isSelected ? "bg-surface" : "bg-surface/30"
												)}
											>
												<RadioIconIndicator
													isSelected={isSelected}
													symbol={opt.symbol}
												/>
												<View className="flex-1 gap-0.5">
													<AppText className="font-medium text-base text-foreground">
														{opt.label}
													</AppText>
													<AppText className="text-foreground/55 text-sm">
														{opt.description}
													</AppText>
												</View>
											</View>
										)}
									</RadioGroup.Item>
								))}
							</RadioGroup>
						</View>
					</SettingsSection>
				</EaseView>

				{/* ── DANGER ZONE ──────────────────────────────────────── */}
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
					<SettingsSection title="Danger zone">
						<SettingsRow
							danger
							icon={settingIcon(DELETE_DATA_ICON)}
							label="Delete all my data"
							onPress={() => setConfirmAction("deleteData")}
							variant="chevron"
						/>
						<SettingsRow
							danger
							icon={settingIcon(DELETE_ACCOUNT_ICON)}
							isLast
							label="Delete account"
							onPress={() => setConfirmAction("deleteAccount")}
							variant="chevron"
						/>
					</SettingsSection>
				</EaseView>
			</ScrollView>

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
