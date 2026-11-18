import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PLAYER_COPY } from "../copy";
import { usePlayer } from "../player-data";
import { fromCover, P } from "../player-metrics";

const FOOT = "text-center text-[12.5px] leading-[17.5px]";

/** The attribution when the licence asks for it, or production's quiet crisis line on a tier-4
 * track (never a sheet: §9.4 "never auto-presented"). */
export function PlayerFoot() {
	const { state, actions } = usePlayer();
	const { track } = state;
	if (!(track?.attribution || track?.crisis)) {
		return null;
	}
	return (
		<View
			className="absolute right-7 left-7"
			style={{ top: fromCover(P.footTop) }}
		>
			{track.crisis ? (
				<AppText className={`${FOOT} text-player-ink/55`} variant="caption">
					{PLAYER_COPY.crisisLead}
					<AppText
						accessibilityRole="link"
						className={`${FOOT} text-player-ink/92 underline`}
						onPress={actions.openCrisisHelp}
						variant="caption"
					>
						{PLAYER_COPY.crisisLink}
					</AppText>
				</AppText>
			) : (
				<AppText
					className={`${FOOT} text-player-ink/55`}
					numberOfLines={2}
					variant="caption"
				>
					{track.attribution}
				</AppText>
			)}
		</View>
	);
}
