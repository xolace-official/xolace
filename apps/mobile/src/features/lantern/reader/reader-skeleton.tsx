import { router } from "expo-router";
import { Skeleton } from "heroui-native";
import { Pressable, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { COPY } from "@/features/lantern/copy";
import { CoverButton } from "@/features/lantern/reader/cover-button";
import { FOLD } from "@/features/lantern/reader/cover-fold";
import { useTokenColor } from "@/lib/use-token-color";

const BACK = { android: "arrow_back", ios: "chevron.left" } as const;
const BAR_GAP = 6;
const LINES = ["w-full", "w-full", "w-11/12", "w-full", "w-2/3"] as const;

// A share link opens the reader with nothing under it.
const goBack = () =>
	router.canGoBack() ? router.back() : router.replace("/(protected)");

/** Production's loading reader: the cover block, then the sheet with a title and a few lines. */
export function ReaderSkeleton() {
	const insets = useSafeAreaInsets();
	const { height } = useWindowDimensions();
	const coverH = Math.round(height * FOLD.coverShare);
	return (
		<View
			accessibilityLabel={COPY.reader.loading}
			className="flex-1 bg-background"
		>
			<Skeleton className="rounded-none" style={{ height: coverH }} />
			<View className="absolute left-4" style={{ top: insets.top + BAR_GAP }}>
				<CoverButton
					icon={BACK}
					label={COPY.reader.bar.back}
					onPress={goBack}
				/>
			</View>
			<View
				className="-mt-7 flex-1 gap-3 rounded-t-[28px] bg-background px-6 pt-7"
				style={{ borderCurve: "continuous" }}
			>
				<Skeleton className="h-3 w-1/4 rounded" />
				<Skeleton className="h-7 w-11/12 rounded-md" />
				<Skeleton className="mb-4 h-7 w-3/5 rounded-md" />
				{LINES.map((w, i) => (
					<Skeleton className={`h-4 rounded ${w}`} key={i} />
				))}
			</View>
		</View>
	);
}

/** A read that's no longer in Lantern (production's line, the redesign's back button). */
export function ReaderGone() {
	const insets = useSafeAreaInsets();
	const ink = useTokenColor("foreground");
	return (
		<View
			className="flex-1 bg-background px-4"
			style={{ paddingTop: insets.top + BAR_GAP }}
		>
			<Pressable
				accessibilityLabel={COPY.reader.bar.back}
				accessibilityRole="button"
				className="size-10 items-center justify-center rounded-full bg-surface-secondary active:opacity-60"
				hitSlop={8}
				onPress={goBack}
			>
				<Icon color={ink} name={BACK} size={17} weight="semibold" />
			</Pressable>
			<View className="flex-1 items-center justify-center px-4">
				<AppText center color="muted" variant="footnote">
					{COPY.reader.gone}
				</AppText>
			</View>
		</View>
	);
}
