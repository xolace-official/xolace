import { View } from "react-native";
import { SharedValue } from "react-native-reanimated";
import { MenuButtons } from "@/src/features/idle-menu/menu-buttons";

type Props = {
  isOpen: SharedValue<boolean>;
  isOpenJS: boolean;
  onClose: () => void;
};

export const MenuButtonsWrapper = ({ isOpen, isOpenJS, onClose }: Props) => (
  <View className="mb-2 min-w-56" pointerEvents={isOpenJS ? "auto" : "none"}>
    <MenuButtons isOpen={isOpen} onClose={onClose} />
  </View>
);
