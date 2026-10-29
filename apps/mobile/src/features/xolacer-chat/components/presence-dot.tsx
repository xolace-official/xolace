import { View } from "react-native";
import { cn } from "@/lib/utils";

/** "Here now" dot on an avatar corner. Decorative: every caller already says it in its own
 * accessibility label. The `border-surface` ring keeps it visible over a same-colour photo. */
export function PresenceDot({ large = false }: { large?: boolean }) {
	return (
		<View
			accessibilityElementsHidden
			className={cn(
				"absolute rounded-full border-2 border-surface bg-success",
				large ? "-right-1 -bottom-1 h-4 w-4" : "-right-0.5 -bottom-0.5 h-3 w-3"
			)}
			importantForAccessibility="no-hide-descendants"
		/>
	);
}
