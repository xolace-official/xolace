import { specialtyLabel } from "@xolace/backend/convex/lib/specialties";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { cn } from "@/lib/utils";

const styles = StyleSheet.create({
	borderCurve: { borderCurve: "continuous" },
});

/** The tags a xolacer declared, on a roster row or under a profile bio. */
export function SpecialtyChips({
	specialties,
	muted = false,
	className,
}: {
	specialties: readonly string[];
	muted?: boolean;
	className?: string;
}) {
	if (specialties.length === 0) {
		return null;
	}

	return (
		<View className={cn("flex-row flex-wrap gap-1.5", className)}>
			{specialties.map((slug) => (
				<View
					className={cn(
						"rounded-lg px-2 py-1",
						muted ? "bg-surface-tertiary" : "bg-accent/10"
					)}
					key={slug}
					style={styles.borderCurve}
				>
					<AppText
						className={cn(
							"font-medium text-[11px]",
							muted ? "text-muted" : "text-accent"
						)}
					>
						{specialtyLabel(slug)}
					</AppText>
				</View>
			))}
		</View>
	);
}
