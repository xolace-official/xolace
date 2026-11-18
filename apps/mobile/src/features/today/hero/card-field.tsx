import { View } from "react-native";
import { Icon } from "@/components/shared/icon";
import { RotatingPlaceholder } from "@/components/shared/rotating-placeholder";
import { useTokenColor } from "@/lib/use-token-color";
import type { Frame } from "./card-a11y";

const MIC = 19;

type Props = {
	placeholders: readonly string[];
	running: boolean;
	reduced: boolean;
	/** Where the field and the mic sit, for VoiceOver's copy of the card. */
	onInput: (frame: Frame) => void;
	onMic: (frame: Frame) => void;
};

/** The card's field (board `.field`): 56 tall, radius 22, the well colour, a 42 pt ink mic. */
export function CardField({
	placeholders,
	running,
	reduced,
	onInput,
	onMic,
}: Props) {
	const page = useTokenColor("background");
	return (
		<View
			className="min-h-14 flex-row items-center gap-2.5 rounded-[22px] border-continuous bg-surface-secondary py-1.5 pr-2 pl-4.5"
			onLayout={(e) => onInput(e.nativeEvent.layout)}
		>
			<View className="flex-1">
				<RotatingPlaceholder
					items={placeholders}
					reduced={reduced}
					running={running}
				/>
			</View>
			<View
				className="size-10.5 items-center justify-center rounded-full bg-foreground"
				onLayout={(e) => onMic(e.nativeEvent.layout)}
			>
				<Icon
					color={page}
					name={{ android: "mic", ios: "mic" }}
					size={MIC}
					weight="semibold"
				/>
			</View>
		</View>
	);
}
