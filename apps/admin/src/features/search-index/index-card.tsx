"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@xolace/ui/components/alert-dialog";
import { Badge } from "@xolace/ui/components/badge";
import { Button } from "@xolace/ui/components/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@xolace/ui/components/card";
import { Spinner } from "@xolace/ui/components/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@xolace/ui/components/table";
import { cn } from "@xolace/ui/lib/utils";
import {
	CircleCheckIcon,
	OctagonAlertIcon,
	RefreshCwIcon,
	TriangleAlertIcon,
} from "lucide-react";

import { formatDate } from "@/features/library/types";

import {
	hasGap,
	INDEX_COPY,
	type IndexStatus,
	isEmptyGap,
	type NamespaceStatus,
	type RunState,
	runState,
	stepName,
} from "./types";

/** One meaning index: its run state, the backfill button, and every namespace against its source. */
export function IndexCard({
	status,
	now,
	onBackfill,
}: {
	status: IndexStatus;
	now: number;
	onBackfill: () => void;
}) {
	const copy = INDEX_COPY[status.index];
	const state = runState(status, now);
	const empty = status.namespaces.some(isEmptyGap);
	const gaps = status.namespaces.filter(hasGap);
	return (
		<Card className={cn(empty && "border-coral")}>
			<CardHeader>
				<CardTitle className="flex flex-wrap items-center gap-2">
					{copy.title}
					<RunBadge state={state} />
					{empty ? (
						<Badge variant="coral">
							<TriangleAlertIcon />
							Empty
						</Badge>
					) : null}
				</CardTitle>
				<CardDescription>{copy.description}</CardDescription>
				<CardAction>
					<BackfillButton
						busy={state === "backfilling"}
						onBackfill={onBackfill}
						status={status}
					/>
				</CardAction>
			</CardHeader>
			<CardContent className="flex flex-col gap-5">
				<RunDetails status={status} />
				<NamespaceTable namespaces={status.namespaces} />
				{gaps.length > 0 ? (
					<div className="flex flex-col gap-3">
						{gaps.map((ns) => (
							<GapList key={ns.namespace} namespace={ns} />
						))}
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}

function RunBadge({ state }: { state: RunState }) {
	if (state === "backfilling") {
		return (
			<Badge variant="sky">
				<Spinner className="size-3.5!" />
				Backfilling
			</Badge>
		);
	}
	if (state === "embedding") {
		return (
			<Badge variant="sky">
				<Spinner className="size-3.5!" />
				Embeds landing
			</Badge>
		);
	}
	if (state === "failed") {
		return (
			<Badge variant="coral">
				<OctagonAlertIcon />
				Last run failed
			</Badge>
		);
	}
	return null;
}

function BackfillButton({
	status,
	busy,
	onBackfill,
}: {
	status: IndexStatus;
	busy: boolean;
	onBackfill: () => void;
}) {
	const copy = INDEX_COPY[status.index];
	return (
		<AlertDialog>
			<AlertDialogTrigger
				render={<Button disabled={busy} size="sm" variant="outline" />}
			>
				<RefreshCwIcon />
				Backfill
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Backfill the {copy.title} index?</AlertDialogTitle>
					<AlertDialogDescription>
						{copy.confirm} Each embed is an OpenAI call on this deployment.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={onBackfill}>
						<RefreshCwIcon />
						Backfill
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

/** The migrations component's steps (library, tracks) or the latest job (exercises, xolacers). */
function RunDetails({ status }: { status: IndexStatus }) {
	const { job, migrations } = status;
	if (migrations.length > 0) {
		return (
			<ul className="type-small flex flex-col gap-1 text-ink-muted">
				{migrations.map((step) => (
					<li className="flex flex-wrap items-center gap-2" key={step.name}>
						<code className="text-ink">{stepName(step)}</code>
						<StepState state={step.state} />
						{step.latestStart > 0 ? (
							<span className="tabular-nums">
								{step.processed} rows · started {formatDate(step.latestStart)}
							</span>
						) : (
							<span>never run here</span>
						)}
						{step.error ? (
							<span className="text-coral-text">{step.error}</span>
						) : null}
					</li>
				))}
			</ul>
		);
	}
	if (!job) {
		return (
			<p className="type-small text-ink-muted">Not backfilled from here yet.</p>
		);
	}
	return (
		<p className="type-small flex flex-wrap items-center gap-2 text-ink-muted">
			<StepState state={job.state} />
			<span>
				Started {formatDate(job.startedAt)} by {job.startedByName}
			</span>
			{job.error ? <span className="text-coral-text">{job.error}</span> : null}
		</p>
	);
}

const STEP_LABEL: Record<string, string> = {
	canceled: "Canceled",
	failed: "Failed",
	inProgress: "Running",
	pending: "Queued",
	success: "Done",
	unknown: "Not started",
};

function StepState({ state }: { state: string }) {
	if (state === "success") {
		return (
			<Badge variant="mint">
				<CircleCheckIcon />
				{STEP_LABEL[state]}
			</Badge>
		);
	}
	if (state === "failed") {
		return (
			<Badge variant="coral">
				<OctagonAlertIcon />
				{STEP_LABEL[state]}
			</Badge>
		);
	}
	if (state === "inProgress" || state === "pending") {
		return (
			<Badge variant="sky">
				<Spinner className="size-3.5!" />
				{STEP_LABEL[state]}
			</Badge>
		);
	}
	return <Badge>{STEP_LABEL[state] ?? state}</Badge>;
}

function NamespaceTable({
	namespaces,
}: {
	namespaces: readonly NamespaceStatus[];
}) {
	if (namespaces.length === 0) {
		return <p className="type-small text-ink-muted">No rows to index yet.</p>;
	}
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Namespace</TableHead>
					<TableHead className="text-right">Active rows</TableHead>
					<TableHead className="text-right">Indexed</TableHead>
					<TableHead className="text-right">Missing</TableHead>
					<TableHead className="text-right">Stale</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{namespaces.map((ns) => (
					<TableRow
						className={cn(isEmptyGap(ns) && "bg-coral-soft")}
						key={ns.namespace}
					>
						<TableCell>
							<code className="text-ink">{ns.namespace}</code>
							{isEmptyGap(ns) ? (
								<span className="type-small ml-2 font-semibold text-coral-text">
									Empty
								</span>
							) : null}
						</TableCell>
						<TableCell className="text-right tabular-nums">
							{ns.source}
						</TableCell>
						<TableCell className="text-right tabular-nums">
							{ns.indexed}
							{ns.truncated ? "+" : ""}
						</TableCell>
						<TableCell
							className={cn(
								"text-right tabular-nums",
								ns.missingCount > 0 && "font-semibold text-ember-text"
							)}
						>
							{ns.missingCount}
						</TableCell>
						<TableCell className="text-right text-ink-muted tabular-nums">
							{ns.staleCount}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

/** Missing: should be searchable and isn't. Stale: still searchable after its row went. */
function GapList({ namespace: ns }: { namespace: NamespaceStatus }) {
	return (
		<div className="type-small flex flex-col gap-1">
			<code className="text-ink">{ns.namespace}</code>
			{ns.missingCount > 0 ? (
				<KeyLine count={ns.missingCount} keys={ns.missing} label="Missing" />
			) : null}
			{ns.staleCount > 0 ? (
				<KeyLine count={ns.staleCount} keys={ns.stale} label="Stale" />
			) : null}
		</div>
	);
}

function KeyLine({
	label,
	keys,
	count,
}: {
	label: string;
	keys: NamespaceStatus["missing"];
	count: number;
}) {
	const more = count - keys.length;
	return (
		<p className="text-ink-muted">
			<span className="font-semibold text-ink">{label}:</span>{" "}
			{keys.map((k) => k.label).join(", ")}
			{more > 0 ? ` and ${more} more` : ""}
		</p>
	);
}
