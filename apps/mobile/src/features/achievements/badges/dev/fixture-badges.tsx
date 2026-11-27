import { BadgesProvider } from "@/features/achievements/badges/badges-data";
import {
	BadgesScreen,
	type OpenOnArrival,
} from "@/features/achievements/badges/badges-screen";
import { useFixtureBadges } from "@/features/achievements/badges/dev/use-fixture-badges";

export function FixtureBadges({
	open,
	loading = false,
}: {
	open?: OpenOnArrival;
	loading?: boolean;
}) {
	const value = useFixtureBadges();
	return (
		<BadgesProvider
			value={
				loading
					? { ...value, state: { ...value.state, view: undefined } }
					: value
			}
		>
			<BadgesScreen open={open} />
		</BadgesProvider>
	);
}
