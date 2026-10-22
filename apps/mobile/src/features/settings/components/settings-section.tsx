import { View } from "react-native";
import { AppText } from "@/src/components/shared/app-text";
import { cn } from "@/src/lib/utils";

type Props = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * A settings section container with an uppercase muted title label
 * followed by its row children below.
 */
export const SettingsSection = ({ title, children, className }: Props) => (
  <View className={cn("mb-8", className)}>
    <AppText className="text-xs font-semibold tracking-widest text-accent uppercase px-5 pb-3">
      {title}
    </AppText>
    <View>{children}</View>
  </View>
);
