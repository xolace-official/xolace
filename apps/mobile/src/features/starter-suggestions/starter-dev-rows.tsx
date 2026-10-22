/**
 * Dev tools rows for Starter suggestions (#465). Rendered inside the `__DEV__`
 * DevToolsSection; the store flag they set is itself honoured only under
 * `__DEV__` (see useStarterSuggestions).
 */
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useThemeColor, useToast } from "heroui-native";

import { SettingsRow } from "@/src/features/settings/components/settings-row";
import { useAppStore } from "@/src/store/store";

const MAP_ICON = { ios: "map", android: "map", web: "map" } as const;

export function StarterSuggestionsDevRows() {
  const router = useRouter();
  const { toast } = useToast();
  const muted = useThemeColor("muted") as string;
  const icon = <SymbolView name={MAP_ICON} size={17} tintColor={muted} />;

  // Idempotent pair, so an E2E flow gets the same state whatever it started
  // from. "As new user" is a fresh device too: the tour replays and the bubble
  // follows it. Straight home, since the home tour draws over whatever screen
  // is on top.
  const arm = (asNewUser: boolean) => {
    useAppStore.setState({
      devStarterEligible: asNewUser,
      starterSuggestionsSeen: false,
      ...(asNewUser && { reflectTourVersion: 0 }),
    });
    toast.show({ label: asNewUser ? "Starter suggestions armed · new user" : "Starter suggestions · real gate" });
    router.dismissTo("/");
  };

  return (
    <>
      <SettingsRow variant="action" icon={icon} label="Starter suggestions · as new user" onPress={() => arm(true)} />
      <SettingsRow variant="action" icon={icon} label="Starter suggestions · real gate" onPress={() => arm(false)} />
    </>
  );
}
