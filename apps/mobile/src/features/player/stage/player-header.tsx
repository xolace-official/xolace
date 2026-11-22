import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";
import { PLAYER_COPY } from "../copy";
import { usePlayer } from "../player-data";
import { fromCover, INK, P } from "../player-metrics";

export function PlayerHeader() {
	const { state, actions } = usePlayer();
	const ink = useTokenColor("player-ink");
	const { track, repeat } = state;
	return (
		<View
			className="absolute right-5 flex-row items-start gap-3"
			pointerEvents="box-none"
			style={{ left: P.side, top: fromCover(P.labelTop) }}
		>
			<View
				accessibilityLabel={
					track ? `${track.title}, ${track.label}` : undefined
				}
				accessibilityRole="header"
				accessible={!!track}
				className="flex-1 gap-1.25"
				pointerEvents="none"
			>
				<AppText
					className="text-[12px] text-player-ink/62 uppercase leading-[15px] tracking-[0.96px]"
					variant="caption"
					weight="bold"
				>
					{track?.label ?? " "}
				</AppText>
				<AppText
					className="text-[24px] text-player-ink leading-[28.8px] tracking-[-0.36px]"
					numberOfLines={2}
					variant="title"
					weight="semibold"
				>
					{track?.title ?? " "}
				</AppText>
			</View>
			<Pressable
				accessibilityLabel={PLAYER_COPY.repeat}
				accessibilityRole="switch"
				accessibilityState={{ checked: repeat, disabled: !track }}
				className={cn(
					"mt-3 size-10 items-center justify-center rounded-full",
					repeat && "bg-player-ink/20"
				)}
				disabled={!track}
				onPress={() => {
					playSoftPress();
					actions.setRepeat(!repeat);
				}}
			>
				<Icon
					color={ink}
					name={{ android: "repeat_one", ios: "repeat.1" }}
					size={19}
					style={{ opacity: repeat ? 1 : INK.quiet }}
				/>
			</Pressable>
		</View>
	);
}
