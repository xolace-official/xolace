import { Skeleton } from "heroui-native";
import { View } from "react-native";

const CARDS = 4;

/** The first page loading: a day's label, then cards in the card's own shape (two quote lines,
 * the line and its chip). */
export function MomentsSkeleton() {
	return (
		<View accessibilityLabel="Loading" className="gap-2.5 pt-4">
			<Skeleton className="mx-1 mb-1 h-3.5 w-16 rounded" />
			{Array.from({ length: CARDS }, (_, i) => (
				<View
					className="gap-3 rounded-[24px] border border-continuous border-separator bg-surface p-4"
					// Placeholders never move or change: their place is their identity.
					key={i}
				>
					<Skeleton className="h-4.5 w-11/12 rounded" />
					<Skeleton className="h-4.5 w-2/3 rounded" />
					<View className="flex-row items-center justify-between pt-1">
						<Skeleton className="h-3 w-2/5 rounded" />
						<Skeleton className="h-6 w-16 rounded-[12px]" />
					</View>
				</View>
			))}
		</View>
	);
}
