import { Pressable, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MenuTrigger } from "@/src/features/idle-menu/menu-trigger";
import { MenuButtonsWrapper } from "@/src/features/idle-menu/menu-buttons-wrapper";
import { useMenuState } from "@/src/features/idle-menu/hooks/use-menu-state";
import { Tour } from "@/src/components/ui/tour";
import { TOUR_STEPS } from "@/src/features/reflect/tour-copy";

const EASE_INITIAL = { opacity: 0 };
const EASE_ANIMATE = { opacity: 1 };
const EASE_TRANSITION = {
  type: "timing" as const,
  duration: 150,
  easing: [0.455, 0.03, 0.515, 0.955] as [number, number, number, number],
};

export const IdleMenu = () => {
  const { isOpen, isOpenJS, toggle, close } = useMenuState();
  const absoluteFillStyle = StyleSheet.absoluteFill;
  // The host screen pads its root by the top inset, so an absoluteFill here
  // stops short of the status bar. Reach back over that padding: the scrim
  // dims the whole window, the way a scrim should.
  const insets = useSafeAreaInsets();
  const scrimStyle = {
    position: "absolute" as const,
    top: -insets.top,
    left: 0,
    right: 0,
    bottom: 0,
  };

  return (
    <View style={absoluteFillStyle} pointerEvents="box-none">
      {isOpenJS && (
        <EaseView
          initialAnimate={EASE_INITIAL}
          animate={EASE_ANIMATE}
          transition={EASE_TRANSITION}
          style={scrimStyle}
          pointerEvents="auto"
        >
          <BlurView intensity={20} tint="dark" style={absoluteFillStyle} />
          <Pressable
            style={absoluteFillStyle}
            onPress={close}
            accessible={false}
          />
        </EaseView>
      )}
      <View style={styles.menuAnchor} pointerEvents="box-none">
        <MenuButtonsWrapper
          isOpen={isOpen}
          isOpenJS={isOpenJS}
          onClose={close}
        />
        {/* Last step of the reflect tour. The trigger is a plain view, unlike
            the profile and crisis controls in the header, so it can simply be
            wrapped — see TOUR_STEPS for the ordering. */}
        <Tour.Step
          order={3}
          shape="circle"
          title={TOUR_STEPS[3].title}
          description={TOUR_STEPS[3].description}
        >
          <MenuTrigger isOpen={isOpen} isOpenJS={isOpenJS} onPress={toggle} />
        </Tour.Step>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  menuAnchor: {
    position: "absolute",
    bottom: 72,
    right: 24,
    alignItems: "flex-end",
  },
});
