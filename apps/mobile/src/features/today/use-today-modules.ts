import { api } from "@xolace/backend/api";
import { INTAKE_V2_VERSION } from "@xolace/backend/convex/lib/validators";
import { useConvex, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useState } from "react";
import { useFullContext } from "@/lib/convex/use-full-context";
import { campfireView } from "./campfire/campfire-model";
import { kindlingOutcome, kindlingView } from "./kindling/kindling-model";
import { useKeptKindling } from "./kindling/use-kept-kindling";

type CampfireStats = FunctionReturnType<typeof api.intake.campfireStats>;

/**
 * The v2 intake's campfire count, read once per mount and only when asked: it scans recent
 * sessions app-wide, so a live subscription would re-run on every user's session (as
 * production's Discovery read it). A failed read shows nothing.
 */
function useCampfireStatsOnce(wanted: boolean): CampfireStats | null {
	const convex = useConvex();
	const [stats, setStats] = useState<CampfireStats | null>(null);
	useEffect(() => {
		if (!wanted) {
			return;
		}
		let cancelled = false;
		convex
			.query(api.intake.campfireStats, {})
			.then((result) => {
				if (!cancelled) {
					setStats(result);
				}
			})
			.catch(() => undefined);
		return () => {
			cancelled = true;
		};
	}, [convex, wanted]);
	return stats;
}

/** Your kindling (`withRead`/`withTry`: this client draws every kind of step) and the campfire. */
export function useModules() {
	const active = useQuery(api.paths.getActive, {
		withRead: true,
		withTry: true,
	});
	const cohort = useQuery(api.cohort.getWeeklyCohortCard);
	// v2 cut the intake's campfire count; it stands in for the cohort until there's a
	// weekly number of their own (#712), as on production's Discovery.
	const v2Intake =
		useFullContext()?.intake?.intakeVersion === INTAKE_V2_VERSION;
	const stats = useCampfireStatsOnce(cohort?.status === "hidden" && v2Intake);
	// With no kindling, how the latest ended: a tended one's last step still celebrates.
	const latest = useQuery(api.paths.getLatest, active === null ? {} : "skip");
	const kindling = useKeptKindling(
		active === undefined ? undefined : kindlingView(active),
		latest === undefined ? undefined : kindlingOutcome(latest)
	);
	return { campfire: campfireView(cohort, stats, v2Intake), kindling };
}
