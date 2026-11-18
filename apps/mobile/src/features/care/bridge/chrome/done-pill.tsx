import Animated from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { GlassGroup } from "@/components/shared/glass-group";
import { Icon, type IconName } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { riseIn } from "@/design/entering";
import { COPY } from "@/features/care/bridge/copy";
import { playAffirmativePress } from "@/lib/haptics";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";

const CHECK: IconName = { android: "check", ios: "checkmark" };
const GLYPH = 14;
const RISE = 6;

/** "Done", once a share finished: a small landing for having reached out. */
export function DonePill({ onPress }: { onPress: () => void }) {
	const reduced = useEffectiveReducedMotion();
	const foreground = useTokenColor("foreground");
	return (
		<Animated.View entering={riseIn(0, reduced, RISE)}>
			<GlassGroup className="p-0">
				<PressScale
					accessibilityHint={COPY.draft.doneHint}
					accessibilityLabel={COPY.draft.done}
					className="h-11 flex-row items-center gap-1.5 px-4"
					haptic={playAffirmativePress}
					onPress={onPress}
				>
					<Icon
						color={foreground}
						name={CHECK}
						size={GLYPH}
						weight="semibold"
					/>
					<AppText variant="callout" weight="semibold">
						{COPY.draft.done}
					</AppText>
				</PressScale>
			</GlassGroup>
		</Animated.View>
	);
}
