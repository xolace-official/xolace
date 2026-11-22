import { goBack } from "@/components/shared/back-button";
import type { Arrivals } from "@/features/achievements/arrival/arrival-data";
import { ArrivalsProvider } from "@/features/achievements/arrival/arrival-data";
import {
	type ArrivalPlan,
	arrivalPlan,
	type UnseenBadge,
} from "@/features/achievements/arrival/arrival-model";
import type { Still } from "@/features/achievements/arrival/arrival-start";
import { ArrivalOverlay } from "@/features/achievements/arrival/arrivals-host";
import { fixtureArt } from "@/features/achievements/dev/fixture-art";
import { BACKFILL } from "@/features/achievements/dev/fixtures";

const NONE = new Set<string>();

function fixturePlan(
	unseen: readonly UnseenBadge[],
	backfill: boolean
): ArrivalPlan | null {
	const plan = arrivalPlan({
		opened: NONE,
		summary: backfill ? BACKFILL : null,
		unseen,
	});
	if (plan?.kind === "backfill") {
		return {
			...plan,
			thumbnails: plan.thumbnails.map((t) => ({
				...t,
				art: { ...t.art, source: fixtureArt(t.id) },
			})),
		};
	}
	if (plan?.kind === "badges") {
		return {
			...plan,
			badges: plan.badges.map((b) => ({
				...b,
				art: { ...b.art, source: fixtureArt(b.id) },
			})),
		};
	}
	return plan;
}

export function FixtureArrival({
	unseen = [],
	backfill = false,
	still,
}: {
	unseen?: readonly UnseenBadge[];
	backfill?: boolean;
	still?: Still;
}) {
	const value: Arrivals = {
		actions: { closed: goBack, seeBadges: () => undefined },
		state: { open: true, plan: fixturePlan(unseen, backfill) },
	};
	return (
		<ArrivalsProvider value={value}>
			<ArrivalOverlay still={still} />
		</ArrivalsProvider>
	);
}
