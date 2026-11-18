import { PlayerData } from "@/features/player/player-data";
import { PlayerScreen } from "@/features/player/player-screen";

export default function PlayerRoute() {
	return (
		<PlayerData>
			<PlayerScreen />
		</PlayerData>
	);
}
