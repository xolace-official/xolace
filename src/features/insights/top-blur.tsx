// Progressive blur under the transparent header (from
// clarity-main glass-tabs/progressive-blur): one BlurView alpha-masked by an
// eased gradient, plus a --background scrim so the title stays legible.
// Android gets the scrim only (BlurView under a MaskedView is unreliable there).
import { Platform, StyleSheet, View } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "@/src/context/app-theme-context";
import { useTokenColor } from "@/src/features/profile/hooks/use-token-color";

const MASK =
  "linear-gradient(to bottom, rgb(0,0,0) 0%, rgb(0,0,0) 35%, rgba(0,0,0,0.8) 55%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,0) 100%)";

export function TopBlur({ height }: { height: number }) {
  const { isDark } = useAppTheme();
  const bg = useTokenColor("background");
  const strong = Platform.OS === "android" ? "F0" : "B0";
  return (
    <View pointerEvents="none" className="absolute inset-x-0 top-0" style={{ height }}>
      {Platform.OS === "ios" && (
        <MaskedView style={StyleSheet.absoluteFill} maskElement={<View style={{ flex: 1, experimental_backgroundImage: MASK }} />}>
          <BlurView tint={isDark ? "dark" : "light"} intensity={40} style={StyleSheet.absoluteFill} />
        </MaskedView>
      )}
      <LinearGradient colors={[bg + strong, bg + "50", bg + "00"]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
    </View>
  );
}
