import { BadgeShareProvider } from "@/features/achievements/share/badge-share-data";
import { BadgeShareSheet } from "@/features/achievements/share/badge-share-sheet";
import { useFixtureBadgeShare } from "@/features/achievements/share/dev/use-fixture-badge-share";

export function FixtureBadgeShare({
	id,
	named,
	displayName,
}: {
	id: string;
	named?: boolean;
	displayName?: string | null;
}) {
	return (
		<BadgeShareProvider
			value={useFixtureBadgeShare(id, { displayName, named })}
		>
			<BadgeShareSheet />
		</BadgeShareProvider>
	);
}
