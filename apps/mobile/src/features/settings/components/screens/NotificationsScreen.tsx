import { SymbolView } from "expo-symbols";
import { RadioGroup, useThemeColor } from "heroui-native";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/components/shared/app-text";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { SettingsRow } from "@/components/shared/settings-row";
import { SettingsSection } from "@/components/shared/settings-section";
import { HourRadioGroup } from "@/features/settings/components/hour-radio-group";
import { RadioIconIndicator } from "@/features/settings/components/radio-icon-indicator";
import {
	CHAT_NOTIFICATIONS_ICON,
	type CrossPlatformSymbol,
	NOTIFICATIONS_ICON,
	QUIET_HOURS_ICON,
} from "@/features/settings/components/settings-icons";
import {
	type NotificationReach,
	useNotificationSettings,
} from "@/features/settings/hooks/use-notification-settings";
import { cn } from "@/lib/utils";

const REACH_OPTIONS: {
	value: NotificationReach;
	label: string;
	description: string;
	symbol: CrossPlatformSymbol;
}[] = [
	{
		description:
			"Gentle recognition, like a friend who notices without demanding",
		label: "Warm",
		symbol: { android: "favorite", ios: "heart", web: "favorite" },
		value: "warm",
	},
	{
		description: "Honest and pattern-aware, gets to the point",
		label: "Direct",
		symbol: {
			android: "arrow_forward",
			ios: "arrow.right",
			web: "arrow_forward",
		},
		value: "direct",
	},
	{
		description: "Minimal presence, often just a word or two",
		label: "Quiet",
		symbol: {
			android: "volume_down",
			ios: "speaker.wave.1",
			web: "volume_down",
		},
		value: "quiet",
	},
];

const BEFORE_OPTIONS = [
	{ label: "5 am", value: 5 },
	{ label: "6 am", value: 6 },
	{ label: "7 am", value: 7 },
	{ label: "8 am", value: 8 },
	{ label: "9 am", value: 9 },
	{ label: "10 am", value: 10 },
];

const AFTER_OPTIONS = [
	{ label: "7 pm", value: 19 },
	{ label: "8 pm", value: 20 },
	{ label: "9 pm", value: 21 },
	{ label: "10 pm", value: 22 },
	{ label: "11 pm", value: 23 },
];

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

const styles = StyleSheet.create({
	contentContainer: { paddingBottom: 48, paddingTop: 20 },
});

export const NotificationsScreen = () => {
	const {
		gentleReminders,
		setGentleReminders,
		chatNotifications,
		setChatNotifications,
		permissionBlocked,
		dismissPermissionBlocked,
		reach,
		setReach,
		quietWindow,
		setQuietWindow,
	} = useNotificationSettings();

	const mutedColor = useThemeColor("muted") as string;

	const settingIcon = (
		icon: React.ComponentProps<typeof SymbolView>["name"]
	) => <SymbolView name={icon} size={17} tintColor={mutedColor} />;

	const handleQuietToggle = (enabled: boolean) => {
		if (enabled) {
			setQuietWindow({ dontReachAfter: 21, dontReachBefore: 8 });
		} else {
			setQuietWindow(null);
		}
	};

	const handleBeforeChange = (hour: number) => {
		setQuietWindow({
			dontReachAfter: quietWindow?.dontReachAfter ?? 21,
			dontReachBefore: hour,
		});
	};

	const handleAfterChange = (hour: number) => {
		setQuietWindow({
			dontReachAfter: hour,
			dontReachBefore: quietWindow?.dontReachBefore ?? 8,
		});
	};

	const openDeviceSettings = () => {
		dismissPermissionBlocked();
		Linking.openSettings();
	};

	return (
		<>
			<ScrollView
				className="flex-1 bg-background"
				contentContainerStyle={styles.contentContainer}
				contentInsetAdjustmentBehavior="automatic"
				showsVerticalScrollIndicator={false}
			>
				{/* ── REMINDERS ───────────────────────────────────────────── */}
				<EaseView
					animate={{ opacity: 1, translateY: 0 }}
					initialAnimate={{ opacity: 0, translateY: 16 }}
					transition={{ duration: 280, easing: EASE, type: "timing" }}
				>
					<SettingsSection title="Reminders">
						<SettingsRow
							icon={settingIcon(NOTIFICATIONS_ICON)}
							isLast
							isSelected={gentleReminders}
							label="Gentle reminders"
							onToggle={setGentleReminders}
							variant="toggle"
						/>
					</SettingsSection>
				</EaseView>

				{/* ── HOW I REACH OUT ─────────────────────────────────────── */}
				{gentleReminders && (
					<>
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
							<SettingsSection title="How I reach out">
								<View className="px-5">
									<RadioGroup
										className="gap-2"
										onValueChange={(v) => setReach(v as NotificationReach)}
										value={reach}
									>
										{REACH_OPTIONS.map((opt) => (
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

						{/* ── QUIET HOURS ───────────────────────────────────────── */}
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
							<SettingsSection title="Quiet hours">
								<SettingsRow
									icon={settingIcon(QUIET_HOURS_ICON)}
									isLast={!quietWindow}
									isSelected={!!quietWindow}
									label="Enable quiet hours"
									onToggle={handleQuietToggle}
									variant="toggle"
								/>

								{quietWindow && (
									<>
										<HourRadioGroup
											label="Not before"
											onChange={handleBeforeChange}
											options={BEFORE_OPTIONS}
											value={quietWindow.dontReachBefore}
										/>
										<HourRadioGroup
											className="pb-4"
											label="Not after"
											onChange={handleAfterChange}
											options={AFTER_OPTIONS}
											value={quietWindow.dontReachAfter}
										/>
									</>
								)}
							</SettingsSection>
						</EaseView>
					</>
				)}
				{/* ── CONVERSATIONS ───────────────────────────────────────── */}
				<EaseView
					animate={{ opacity: 1, translateY: 0 }}
					initialAnimate={{ opacity: 0, translateY: 16 }}
					transition={{
						delay: gentleReminders ? 180 : 60,
						duration: 280,
						easing: EASE,
						type: "timing",
					}}
				>
					<SettingsSection title="Conversations">
						<SettingsRow
							icon={settingIcon(CHAT_NOTIFICATIONS_ICON)}
							isLast
							isSelected={chatNotifications}
							label="Chat notifications"
							onToggle={setChatNotifications}
							variant="toggle"
						/>
						<AppText className="px-5 pt-3 text-foreground/55 text-sm">
							When someone asks to talk, answers your request, or writes while
							you&apos;re away. Never what was written.
						</AppText>
					</SettingsSection>
				</EaseView>
			</ScrollView>

			{/*
        The one state a toggle cannot resolve itself: the OS has stopped
        asking. Flipping the switch here would promise delivery the device
        won't make, so it stays put and this points at the only route back.
      */}
			<ConfirmationDialog
				confirmLabel="Open Settings"
				description="Your device is blocking notifications, so this can't be turned on from here. You can allow them in device settings."
				isOpen={permissionBlocked}
				onConfirm={openDeviceSettings}
				onOpenChange={(open) => {
					if (!open) {
						dismissPermissionBlocked();
					}
				}}
				title="Notifications are off for Xolace"
			/>
		</>
	);
};
