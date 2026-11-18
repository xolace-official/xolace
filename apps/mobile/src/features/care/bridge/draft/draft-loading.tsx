import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Flux } from "@/components/shared/flux";
import { useBridgeScreen } from "@/features/care/bridge/bridge-data";
import { recipientOf } from "@/features/care/bridge/bridge-model";
import { COPY } from "@/features/care/bridge/copy";
import { ShimmerText } from "@/features/care/bridge/draft/shimmer-text";

const FLUX_SIZE = 132;

/** While the draft is written: Flux thinking, and the words being found for them. */
export function DraftLoading() {
	const { state } = useBridgeScreen();
	return (
		<View
			accessibilityLiveRegion="polite"
			className="flex-1 items-center justify-center gap-3 px-8"
		>
			<Flux
				breathe
				height={FLUX_SIZE}
				label={COPY.loading.mascot}
				pose="thinking"
				width={FLUX_SIZE}
			/>
			<ShimmerText
				text={COPY.loading.title(recipientOf(state.recipient.name))}
			/>
			<AppText center color="muted" variant="callout">
				{COPY.loading.sub}
			</AppText>
		</View>
	);
}
