import { type ReactNode, useState } from "react";
import { View } from "react-native";
import { MODULE_GAP } from "./today-motion";

/**
 * Another feature's card in Today's run of modules, with their gutter and the gap above.
 * Such a card renders nothing on most days, so the gap only opens once it has height:
 * an empty slot takes no room.
 */
export function TodaySlot({ children }: { children: ReactNode }) {
	const [filled, setFilled] = useState(false);
	return (
		<View className="mx-4" style={{ marginTop: filled ? MODULE_GAP : 0 }}>
			<View
				onLayout={(e) => {
					const has = e.nativeEvent.layout.height > 0;
					if (has !== filled) {
						setFilled(has);
					}
				}}
			>
				{children}
			</View>
		</View>
	);
}
