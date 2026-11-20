import { router } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { BackButton } from "@/components/shared/back-button";
import { ReaderSkeleton as ReaderShape } from "@/components/shared/skeleton-shapes";
import { COPY } from "@/features/lantern/copy";
import { CoverButton } from "@/features/lantern/reader/cover-button";

const BACK = { android: "arrow_back", ios: "chevron.left" } as const;
const BAR_GAP = 6;

// A share link opens the reader with nothing under it.
const goBack = () =>
	router.canGoBack() ? router.back() : router.replace("/(protected)");

/** The loading reader: the shared form (the cover in the well, its title bones, the page rising
 * 28 pt over it), with the cover's back button so a slow load never traps anyone. */
export function ReaderSkeleton() {
	const insets = useSafeAreaInsets();
	return (
		<View className="flex-1 bg-background">
			<ReaderShape label={COPY.reader.loading} />
			<View className="absolute left-4" style={{ top: insets.top + BAR_GAP }}>
				<CoverButton
					icon={BACK}
					label={COPY.reader.bar.back}
					onPress={goBack}
				/>
			</View>
		</View>
	);
}

/** A read that's no longer in Lantern: production's line as a centred footnote, under the kit's
 * back button (back, or Today when a link opened it with nothing behind). */
export function ReaderGone() {
	const insets = useSafeAreaInsets();
	return (
		<View
			className="flex-1 bg-background px-4"
			style={{ paddingTop: insets.top + BAR_GAP }}
		>
			<BackButton label={COPY.reader.bar.back} />
			<View className="flex-1 items-center justify-center px-4">
				<AppText center color="muted" variant="footnote">
					{COPY.reader.gone}
				</AppText>
			</View>
		</View>
	);
}
