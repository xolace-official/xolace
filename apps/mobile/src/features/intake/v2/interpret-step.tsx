// `interpret`: Flux listening back while the answer is read (#708). Their own first words,
// echoed, so the wait reads as attention rather than loading.
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { FluxStill } from "@/features/intake/v2/flux-still";
import { echoOf } from "@/features/intake/v2/heard";

const FLUX_SIZE = 160;
const SECOND_LINE_DELAY_MS = 1200;

export function InterpretStep({ words }: { words: string }) {
	return (
		<View
			accessibilityLiveRegion="polite"
			className="flex-1 items-center justify-center gap-6 px-6"
		>
			<FluxStill mood="thinking" size={FLUX_SIZE} />
			<View className="items-center gap-2">
				<AppText className="text-center font-[Poppins-Medium] text-[17px] text-foreground leading-6">
					Hearing &ldquo;{echoOf(words)}&rdquo;
				</AppText>
				<Animated.View entering={FadeIn.delay(SECOND_LINE_DELAY_MS)}>
					<AppText className="text-center font-[Poppins-Regular] text-[14px] text-muted">
						Getting the fire going…
					</AppText>
				</Animated.View>
			</View>
		</View>
	);
}
