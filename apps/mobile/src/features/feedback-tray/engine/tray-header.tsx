import { use } from "react";
import { View } from "react-native";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { SymbolView } from "expo-symbols";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { TrayContext } from "./tray-context";

type CrossPlatformSymbol = React.ComponentProps<typeof SymbolView>["name"];

const BACK_ICON: CrossPlatformSymbol = {
  ios: "chevron.left",
  android: "arrow_back",
};
const CLOSE_ICON: CrossPlatformSymbol = {
  ios: "xmark",
  android: "close",
};

/**
 * Chrome for the tray: a back chevron (only when there's somewhere to go back
 * to) on the left and a close button on the right. Each screen renders its own
 * heading in its body, so the header carries no center title.
 */
export const TrayHeader = () => {
  const { state, actions } = use(TrayContext);
  const accentColor = useThemeColor("accent") as string;
  const mutedColor = useThemeColor("muted") as string;

  const hasBack = state.screenHistory.length > 1;

  return (
    <View className="flex-row items-center justify-between pb-2">
      <View className="h-10 w-10 items-start justify-center">
        {hasBack ? (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <PressableFeedback
              onPress={actions.goBack}
              accessibilityLabel="Go back"
              className="h-10 w-10 items-center justify-center"
            >
              <SymbolView name={BACK_ICON} size={20} tintColor={accentColor} />
            </PressableFeedback>
          </Animated.View>
        ) : null}
      </View>

      <PressableFeedback
        onPress={actions.dismiss}
        accessibilityLabel="Close"
        className="h-10 w-10 items-center justify-center"
      >
        <SymbolView name={CLOSE_ICON} size={18} tintColor={mutedColor} />
      </PressableFeedback>
    </View>
  );
};
