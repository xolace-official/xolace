import { useEffect, useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { COPY } from "./copy";

const BACK_AFTER_MS = 3000;

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
