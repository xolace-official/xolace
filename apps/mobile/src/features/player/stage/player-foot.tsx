import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PLAYER_COPY } from "../copy";
import { usePlayer } from "../player-data";
import { fromCover, P } from "../player-metrics";

const FOOT = "text-center text-[12.5px] leading-[17.5px]";

export function PlayerFoot() {
	const { state, actions } = usePlayer();
	const { track } = state;
	if (!(track?.attribution || track?.crisis)) {
		return null;
	}
	return (
		<View
			className="absolute right-7 left-7"
			pointerEvents="box-none"
			style={{ top: fromCover(P.footTop) }}
		>
			{track.crisis ? (
				<Pressable
					accessibilityRole="link"
					className="active:opacity-50"
					hitSlop={8}
					onPress={actions.openCrisisHelp}
				>
					<AppText className={`${FOOT} text-player-ink/55`} variant="caption">
						{PLAYER_COPY.crisisLead}
						<AppText
							className={`${FOOT} text-player-ink/92 underline`}
							variant="caption"
						>
							{PLAYER_COPY.crisisLink}
						</AppText>
					</AppText>
				</Pressable>
			) : (
				<View pointerEvents="none">
					<AppText
						className={`${FOOT} text-player-ink/55`}
						numberOfLines={2}
						variant="caption"
					>
						{track.attribution}
					</AppText>
				</View>
			)}
		</View>
	);
}
