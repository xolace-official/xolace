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
	lastSevenDays,
	type UnseenBadge,
} from "@/features/achievements/arrival/arrival-model";
import type { Still } from "@/features/achievements/arrival/arrival-start";
import { ArrivalOverlay } from "@/features/achievements/arrival/arrivals-host";
import { fixtureArt } from "@/features/achievements/dev/fixture-art";
import { ARRIVAL_DAY, BACKFILL } from "@/features/achievements/dev/fixtures";

const NONE = new Set<string>();

/**
 * What the milestone's cards show: `designed` fills the week and the freeze as
 * the boards draw them (the server doesn't serve them yet); `live` leaves them
 * out, as the app does today.
 */
type Cards = "designed" | "capped" | "live";

/** The plan the host would stage, with the fixtures' bundled art. */
function fixturePlan(
	unseen: readonly UnseenBadge[],
	backfill: boolean,
	cards: Cards
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
			milestone:
				plan.milestone && cards !== "live"
					? {
							...plan.milestone,
							freeze: cards === "capped" ? "capped" : "earned",
							week: lastSevenDays(ARRIVAL_DAY),
						}
					: plan.milestone,
		};
	}
	return plan;
}

export function FixtureArrival({
	unseen = [],
	backfill = false,
	cards = "designed",
	still,
}: {
	unseen?: readonly UnseenBadge[];
	backfill?: boolean;
	/** The milestone's week and freeze cards (`Cards`). */
	cards?: Cards;
	still?: Still;
}) {
	const value: Arrivals = {
		actions: { closed: goBack, seeBadges: () => undefined },
		state: { open: true, plan: fixturePlan(unseen, backfill, cards) },
	};
	return (
		<ArrivalsProvider value={value}>
			<ArrivalOverlay still={still} />
		</ArrivalsProvider>
	);
}
