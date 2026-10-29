"use client";

import {
	Alert,
	AlertAction,
	AlertDescription,
	AlertTitle,
} from "@xolace/ui/components/alert";
import { Button } from "@xolace/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@xolace/ui/components/card";
import { Progress, ProgressLabel } from "@xolace/ui/components/progress";
import { OctagonAlertIcon, RotateCcwIcon } from "lucide-react";

import {
	type ContentStatus,
	StatusBadge,
} from "@/features/content/status-badge";

import type { ImportItem } from "../types";
import { ActionBadge, ItemKey } from "./diff-parts";
import { useImportRun } from "./import-run-provider";

const SETTLED: readonly ContentStatus[] = [
	"live",
	"failed",
	"needs_review",
	"draft",
	"retired",
];
const STATUS_ORDER: readonly ContentStatus[] = [
	"failed",
	"processing",
	"queued",
	"needs_review",
	"draft",
	"retired",
	"live",
];

/** After Apply: overall progress, then every processed item with its status. */
export function RunStatus() {
	const {
		state: { processed, run, statusCounts, counts },
	} = useImportRun();
	const settled = processed.filter(
		(item) => item.run && SETTLED.includes(item.run.status)
	).length;
	const failed = statusCounts.failed ?? 0;
	const percent = processed.length
		? Math.round((settled / processed.length) * 100)
		: 100;

	const sorted = [...processed].sort(
		(a, b) =>
			STATUS_ORDER.indexOf(a.run?.status ?? "live") -
			STATUS_ORDER.indexOf(b.run?.status ?? "live")
	);

	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardHeader>
					<CardTitle>
						{run.state === "applying" ? "Processing" : "Finished"}
					</CardTitle>
					<CardDescription>
						{settled} of {processed.length} items done
						{failed > 0 ? `, ${failed} failed` : ""}. {counts.unchanged}{" "}
						unchanged and {counts.rejected} rejected weren't processed.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<Progress tone={failed > 0 ? "ember" : "mint"} value={percent}>
						<ProgressLabel className="sr-only">Import progress</ProgressLabel>
					</Progress>
					<ul aria-label="Items by status" className="flex flex-wrap gap-2">
						{STATUS_ORDER.filter((status) => statusCounts[status]).map(
							(status) => (
								<li className="flex items-center gap-1.5" key={status}>
									<StatusBadge status={status} />
									<span className="type-body-strong text-ink">
										{statusCounts[status]}
									</span>
								</li>
							)
						)}
					</ul>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Items</CardTitle>
				</CardHeader>
				<CardContent>
					<ul
						aria-live="polite"
						className="flex flex-col divide-y-2 divide-line"
					>
						{sorted.map((item) => (
							<RunItem item={item} key={item.id} />
						))}
					</ul>
				</CardContent>
			</Card>
		</div>
	);
}

function RunItem({ item }: { item: ImportItem }) {
	const { actions } = useImportRun();
	const status = item.run?.status ?? "queued";
	return (
		<li className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0">
			<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
				<div className="flex min-w-0 flex-1 flex-col">
					<span className="type-body-strong truncate text-ink">
						{item.title}
					</span>
					<ItemKey item={item} />
				</div>
				{status === "processing" && item.run?.step ? (
					<span className="type-small text-sky-text">{item.run.step}…</span>
				) : null}
				{(item.run?.attempt ?? 1) > 1 ? (
					<span className="type-small text-ink-muted">
						Attempt {item.run?.attempt}
					</span>
				) : null}
				<ActionBadge action={item.action} />
				<StatusBadge status={status} />
			</div>
			{item.run?.failure ? (
				<Alert variant="coral">
					<OctagonAlertIcon />
					<AlertTitle>Failed at “{item.run.failure.step}”</AlertTitle>
					<AlertDescription>{item.run.failure.message}</AlertDescription>
					<AlertAction>
						<Button
							onClick={() => actions.retry(item.id)}
							size="sm"
							variant="outline"
						>
							<RotateCcwIcon />
							Retry
						</Button>
					</AlertAction>
				</Alert>
			) : null}
		</li>
	);
}
