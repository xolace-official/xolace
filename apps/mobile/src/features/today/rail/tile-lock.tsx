import { View } from "react-native";
import { Icon } from "@/components/shared/icon";
import { useTokenColor } from "@/lib/use-token-color";

const LOCK = 10;

/** Production's shelf-tile lock: a free member's track opens Xolace+. VoiceOver hears it in the label. */
export function TileLock({ inline = false }: { inline?: boolean }) {
	const ink = useTokenColor("foreground");
	return (
		<View
			accessibilityElementsHidden
			className={
				inline
					? "size-5 items-center justify-center rounded-full bg-surface-secondary"
					: "absolute right-2 bottom-2 size-5 items-center justify-center rounded-full bg-background/85"
			}
			importantForAccessibility="no-hide-descendants"
		>
			<Icon
				color={ink}
				name={{ android: "lock", ios: "lock.fill" }}
				size={LOCK}
			/>
		</View>
	);
}
