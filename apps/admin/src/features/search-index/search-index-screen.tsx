"use client";

import { api } from "@xolace/backend/api";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@xolace/ui/components/alert";
import { Spinner } from "@xolace/ui/components/spinner";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { TriangleAlertIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { runAction } from "@/features/content/run-action";
import {
	PageHeader,
	PageHeaderDescription,
	PageHeaderHeading,
	PageHeaderTitle,
} from "@/features/shell/page-header";

import { IndexCard } from "./index-card";
import { INDEX_COPY, isEmptyGap } from "./types";

/** How often "embeds landing" re-checks the clock; the counts update on their own. */
const CLOCK_TICK_MS = 15_000;

function useNow() {
	const [now, setNow] = useState(Date.now);
	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
		return () => clearInterval(id);
	}, []);
	return now;
}

/** `/search-index`: each meaning index against its source rows, with a backfill per index. */
export function SearchIndexScreen() {
	// Skipped until Convex has the Clerk token (see LibraryProvider).
	const { isAuthenticated } = useConvexAuth();
	const indexes = useQuery(
		api.admin.searchIndex.status,
		isAuthenticated ? {} : "skip"
	);
	const start = useMutation(api.admin.searchIndex.start);
	const removeStale = useMutation(api.admin.searchIndex.removeStale);
	const now = useNow();

	const empty = (indexes ?? []).flatMap((s) =>
		s.namespaces.filter(isEmptyGap).map((ns) => ns.namespace)
	);

	return (
		<>
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderTitle>Search index</PageHeaderTitle>
				</PageHeaderHeading>
				<PageHeaderDescription>
					Kindling suggests tracks, reads, exercises and xolacers by meaning,
					from what's embedded here. A deployment starts with nothing embedded:
					backfill an index when it's empty or missing rows.
				</PageHeaderDescription>
			</PageHeader>

			{indexes === undefined ? (
				<div
					aria-live="polite"
					className="flex min-h-64 items-center justify-center gap-3 text-muted-foreground"
				>
					<Spinner />
					Reading the indexes…
				</div>
			) : (
				<div className="flex flex-col gap-6">
					{empty.length > 0 ? (
						<Alert variant="coral">
							<TriangleAlertIcon />
							<AlertTitle>
								{empty.length === 1
									? "1 namespace is"
									: `${empty.length} namespaces are`}{" "}
								empty while there are active rows to index
							</AlertTitle>
							<AlertDescription>
								Search finds nothing there until it's backfilled:{" "}
								{empty.join(", ")}.
							</AlertDescription>
						</Alert>
					) : null}
					{indexes.map((status) => (
						<IndexCard
							key={status.index}
							now={now}
							onBackfill={() => {
								runAction(
									() => start({ index: status.index }),
									`${INDEX_COPY[status.index].title} backfill started`
								);
							}}
							onRemoveStale={() => {
								runAction(
									() => removeStale({ index: status.index }),
									`Stale ${INDEX_COPY[status.index].title} keys removed`
								);
							}}
							status={status}
						/>
					))}
				</div>
			)}
		</>
	);
}
