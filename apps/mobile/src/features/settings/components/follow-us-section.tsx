import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import type { ComponentProps } from "react";
import { Linking } from "react-native";
import { SettingsRow } from "@/src/features/settings/components/settings-row";
import { SettingsSection } from "@/src/features/settings/components/settings-section";

const WEBSITE_ICON = {
	android: "language",
	ios: "globe",
	web: "language",
} as const;
const INSTAGRAM_ICON = {
	android: "photo_camera",
	ios: "camera",
	web: "photo_camera",
} as const;
const TIKTOK_ICON = {
	android: "music_note",
	ios: "music.note",
	web: "music_note",
} as const;
const LINKEDIN_ICON = {
	android: "business_center",
	ios: "briefcase",
	web: "business_center",
} as const;
const SNAPCHAT_ICON = { android: "chat", ios: "message", web: "chat" } as const;
const WHATSAPP_ICON = {
	android: "forum",
	ios: "message.badge",
	web: "forum",
} as const;

export const FollowUsSection = () => {
	const mutedColor = useThemeColor("muted") as string;
	const icon = (name: ComponentProps<typeof SymbolView>["name"]) => (
		<SymbolView name={name} size={17} tintColor={mutedColor} />
	);

	return (
		<SettingsSection title="Follow Us">
			<SettingsRow
				icon={icon(WEBSITE_ICON)}
				label="Website"
				onPress={() =>
					Linking.openURL("https://xolaceinc.com").catch(console.error)
				}
				variant="chevron"
			/>
			<SettingsRow
				icon={icon(INSTAGRAM_ICON)}
				label="Instagram"
				onPress={() =>
					Linking.openURL("https://www.instagram.com/xolaceinc").catch(
						console.error
					)
				}
				variant="chevron"
			/>
			<SettingsRow
				icon={icon(TIKTOK_ICON)}
				label="TikTok"
				onPress={() =>
					Linking.openURL("https://www.tiktok.com/@talk.with.xolace").catch(
						console.error
					)
				}
				variant="chevron"
			/>
			<SettingsRow
				icon={icon(LINKEDIN_ICON)}
				label="LinkedIn"
				onPress={() =>
					Linking.openURL("https://www.linkedin.com/company/xolace-inc/").catch(
						console.error
					)
				}
				variant="chevron"
			/>
			<SettingsRow
				icon={icon(SNAPCHAT_ICON)}
				label="Snapchat"
				onPress={() =>
					Linking.openURL("https://snapchat.com/t/ooayya7k").catch(
						console.error
					)
				}
				variant="chevron"
			/>
			<SettingsRow
				icon={icon(WHATSAPP_ICON)}
				isLast
				label="WhatsApp Channel"
				onPress={() =>
					Linking.openURL(
						"https://whatsapp.com/channel/0029Vb68RgXGpLHPmY1pL73s"
					).catch(console.error)
				}
				variant="chevron"
			/>
		</SettingsSection>
	);
};
