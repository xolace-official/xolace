/**
 * The arrival on fixtures: the real overlay under a provider filled from
 * `arrivalPlan` over fixture rows, open at once. Closing goes back; "See them"
 * does nothing. Never reaches the backend.
 */
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
import { ARRIVAL_DAY, BACKFILL } from "@/features/achievements/dev/fixtures";

const NONE = new Set<string>();

/** The plan the host would stage, with the fixtures' bundled art. */
function fixturePlan(
	unseen: readonly UnseenBadge[],
	backfill: boolean,
	capped: boolean
): ArrivalPlan | null {
	const plan = arrivalPlan({
		opened: NONE,
		summary: backfill ? BACKFILL : null,
		today: ARRIVAL_DAY,
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
			milestone: plan.milestone && {
				...plan.milestone,
				freeze: capped ? "capped" : "earned",
			},
		};
	}
	return plan;
}

export function FixtureArrival({
	unseen = [],
	backfill = false,
	capped = false,
	still,
}: {
	unseen?: readonly UnseenBadge[];
	backfill?: boolean;
	/** A freeze already held: this milestone's isn't added. */
	capped?: boolean;
	still?: Still;
}) {
	const value: Arrivals = {
		actions: { closed: goBack, seeBadges: () => undefined },
		state: { open: true, plan: fixturePlan(unseen, backfill, capped) },
	};
	return (
		<ArrivalsProvider value={value}>
			<ArrivalOverlay still={still} />
		</ArrivalsProvider>
	);
}
