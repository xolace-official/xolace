/** Lantern's loading shapes; each mirrors the screen it stands in for. */
import { Skeleton } from "heroui-native";
import { useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "@/features/library/reader/reader-parts";

/** EntryRow's shape: thumbnail, kicker, two-line title, meta. */
export function RowsSkeleton({ count = 6 }: { count?: number }) {
	return (
		<View accessibilityLabel="Loading">
			{Array.from({ length: count }, (_, i) => (
				<View className="flex-row items-center gap-4 px-4 py-3" key={i}>
					<Skeleton
						className="rounded-[14px]"
						style={{ height: 78, width: 104 }}
					/>
					<View className="flex-1 gap-2">
						<Skeleton className="h-3 w-1/3 rounded" />
						<Skeleton className="h-4 w-11/12 rounded" />
						<Skeleton className="h-3 w-1/2 rounded" />
					</View>
				</View>
			))}
		</View>
	);
}

/** The reader's cover fold: cover block, sheet with title and a few paragraph lines. */
export function ReaderSkeleton() {
	const insets = useSafeAreaInsets();
	const { height } = useWindowDimensions();
	const coverH = Math.round(height * 0.52);
	return (
		<View accessibilityLabel="Loading" className="flex-1 bg-background">
			<Skeleton className="rounded-none" style={{ height: coverH }} />
			<View className="absolute left-4" style={{ top: insets.top + 6 }}>
				<BackButton onCover />
			</View>
			<View
				className="-mt-7 flex-1 gap-3 rounded-t-[28px] bg-background px-5 pt-7"
				style={{ borderCurve: "continuous" }}
			>
				<Skeleton className="h-3 w-1/4 rounded" />
				<Skeleton className="h-7 w-11/12 rounded-md" />
				<Skeleton className="mb-4 h-7 w-3/5 rounded-md" />
				{["w-full", "w-full", "w-11/12", "w-full", "w-2/3"].map((w, i) => (
					<Skeleton className={`h-4 rounded ${w}`} key={i} />
				))}
			</View>
		</View>
	);
}
