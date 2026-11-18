import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { playSoftPress } from "@/lib/haptics";
import { PlayerGlass } from "../chrome/player-glass";
import { PLAYER_COPY } from "../copy";
import { usePlayer } from "../player-data";
import { fromCover, P } from "../player-metrics";

const ERROR_Y = 390;

/** Production's words. "Couldn’t reach" gains Try again in glass; "isn’t here anymore" gets
 * nothing. */
export function PlayerError() {
	const { state, actions } = usePlayer();
	const gone = state.status === "gone";
	return (
		<View
			className="absolute right-8 left-8 items-center gap-4.5"
			style={{ top: fromCover(ERROR_Y) }}
		>
			<AppText
				accessibilityRole="alert"
				className="text-center text-[15px] text-player-ink/75 leading-[20px]"
				variant="callout"
			>
				{gone ? PLAYER_COPY.gone : PLAYER_COPY.cantReach}
			</AppText>
			{gone ? null : (
				<Pressable
					accessibilityRole="button"
					onPress={() => {
						playSoftPress();
						actions.retry();
					}}
				>
					<PlayerGlass
						className="justify-center px-5.5"
						style={{
							borderRadius: P.glass / 2,
							height: P.glass,
							justifyContent: "center",
							paddingHorizontal: 22,
						}}
					>
						<AppText
							className="text-[15px] text-player-ink"
							variant="callout"
							weight="semibold"
						>
							{PLAYER_COPY.tryAgain}
						</AppText>
					</PlayerGlass>
				</Pressable>
			)}
		</View>
	);
}
