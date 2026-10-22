import { type ComponentProps } from "react";
import { Linking } from "react-native";
import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { SettingsSection } from "@/src/features/settings/components/settings-section";
import { SettingsRow } from "@/src/features/settings/components/settings-row";

const WEBSITE_ICON = {
  ios: "globe",
  android: "language",
  web: "language",
} as const;
const INSTAGRAM_ICON = {
  ios: "camera",
  android: "photo_camera",
  web: "photo_camera",
} as const;
const TIKTOK_ICON = {
  ios: "music.note",
  android: "music_note",
  web: "music_note",
} as const;
const LINKEDIN_ICON = {
  ios: "briefcase",
  android: "business_center",
  web: "business_center",
} as const;
const SNAPCHAT_ICON = { ios: "message", android: "chat", web: "chat" } as const;
const WHATSAPP_ICON = {
  ios: "message.badge",
  android: "forum",
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
        variant="chevron"
        icon={icon(WEBSITE_ICON)}
        label="Website"
        onPress={() =>
          Linking.openURL("https://xolaceinc.com").catch(console.error)
        }
      />
      <SettingsRow
        variant="chevron"
        icon={icon(INSTAGRAM_ICON)}
        label="Instagram"
        onPress={() =>
          Linking.openURL("https://www.instagram.com/xolaceinc").catch(
            console.error,
          )
        }
      />
      <SettingsRow
        variant="chevron"
        icon={icon(TIKTOK_ICON)}
        label="TikTok"
        onPress={() =>
          Linking.openURL("https://www.tiktok.com/@talk.with.xolace").catch(
            console.error,
          )
        }
      />
      <SettingsRow
        variant="chevron"
        icon={icon(LINKEDIN_ICON)}
        label="LinkedIn"
        onPress={() =>
          Linking.openURL("https://www.linkedin.com/company/xolace-inc/").catch(
            console.error,
          )
        }
      />
      <SettingsRow
        variant="chevron"
        icon={icon(SNAPCHAT_ICON)}
        label="Snapchat"
        onPress={() =>
          Linking.openURL("https://snapchat.com/t/ooayya7k").catch(
            console.error,
          )
        }
      />
      <SettingsRow
        variant="chevron"
        icon={icon(WHATSAPP_ICON)}
        label="WhatsApp Channel"
        onPress={() =>
          Linking.openURL(
            "https://whatsapp.com/channel/0029Vb68RgXGpLHPmY1pL73s",
          ).catch(console.error)
        }
        isLast
      />
    </SettingsSection>
  );
};
