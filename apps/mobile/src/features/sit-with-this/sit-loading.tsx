import { useEffect, useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { COPY } from "./copy";

/** Long enough that a normal load never shows it. */
const BACK_AFTER_MS = 3000;

/**
 * "Getting ready…". Offline or while Convex reconnects the exercise can stay loading, and
 * this screen has no close and no swipe back, so after a moment it offers the empty
 * state's "Go back".
 */
export function SitLoading({ onBack }: { onBack: () => void }) {
	const [late, setLate] = useState(false);
	useEffect(() => {
		const id = setTimeout(() => setLate(true), BACK_AFTER_MS);
		return () => clearTimeout(id);
	}, []);
	return (
		<View className="flex-1 items-center justify-center gap-6 bg-background px-8">
			<AppText color="subtle" variant="callout">
				{COPY.loading}
			</AppText>
			{late ? (
				<PressScale
					accessibilityRole="button"
					className="min-h-11 justify-center px-4"
					onPress={onBack}
				>
					<AppText color="subtle" variant="callout" weight="medium">
						{COPY.empty.back}
					</AppText>
				</PressScale>
			) : null}
		</View>
	);
}
