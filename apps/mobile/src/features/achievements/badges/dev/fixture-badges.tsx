import { BadgesProvider } from "@/features/achievements/badges/badges-data";
import {
	BadgesScreen,
	type OpenOnArrival,
} from "@/features/achievements/badges/badges-screen";
import { useFixtureBadges } from "@/features/achievements/badges/dev/use-fixture-badges";

export function FixtureBadges({ open }: { open?: OpenOnArrival }) {
	return (
		<BadgesProvider value={useFixtureBadges()}>
			<BadgesScreen open={open} />
		</BadgesProvider>
	);
}
