import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { COPY } from "../copy";
import { LAYOUT } from "../layout";
import { useReflect } from "../reflect-data";
import { takeCountdown } from "../reflect-model";
import { ListenPill } from "./listen-pill";
import { MicButton } from "./mic-button";
import { useMicPhase } from "./use-mic-phase";

const BAR = LAYOUT.bar;
const MAX_SCALE = 1.3;

export function BottomBar({
	onSend,
	onTap,
}: {
	onSend: () => void;
	onTap: () => void;
}) {
	const { state } = useReflect();
	const { listening, take } = state;
	const writing = take.writing;
	const ready =
		(state.text.trim().length > 0 || state.picks.length > 0) &&
		!(listening || writing);
	const mic = useMicPhase(onTap);

	return (
		<View
			className="flex-row items-center"
			style={{ gap: BAR.gap, height: BAR.height }}
		>
			<MicButton
				onPhase={mic.setPhase}
				onRelease={mic.release}
				phase={mic.phase}
			/>
			<PressScale
				accessibilityLabel={COPY.write.send}
				accessibilityRole="button"
				accessibilityState={{ disabled: !ready }}
				className={cn(
					"flex-1 items-center justify-center rounded-full bg-foreground",
					!ready && "opacity-28"
				)}
				disabled={!ready}
				onPress={onSend}
				style={{ height: BAR.height }}
			>
				<AppText
					className="text-[17px]"
					color="background"
					maxFontSizeMultiplier={MAX_SCALE}
					variant="body"
					weight="semibold"
				>
					{COPY.write.send}
				</AppText>
			</PressScale>
			<ListenPill
				countdown={takeCountdown(take.remainingMs)}
				listening={listening}
				onCancel={mic.cancelLocked}
				phase={mic.phase}
				writing={writing}
			/>
		</View>
	);
}
