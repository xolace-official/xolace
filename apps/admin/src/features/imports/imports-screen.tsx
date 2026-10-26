"use client";

import { Badge } from "@xolace/ui/components/badge";
import { buttonVariants } from "@xolace/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@xolace/ui/components/table";
import { CircleSlashIcon, EyeIcon, UploadIcon } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/features/content/status-badge";
import { EmptyState } from "@/features/flux/empty-state";
import { formatDate } from "@/features/library/types";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderDescription,
	PageHeaderHeading,
	PageHeaderTitle,
} from "@/features/shell/page-header";

import { useImports } from "./imports-provider";
import { ActionBadge } from "./run/diff-parts";
import {
	countByAction,
	countByStatus,
	DIFF_ACTIONS,
	type ImportRun,
	TARGET_LABEL,
} from "./types";

/** `/imports`: every bulk import, newest first, with what it changed and how it went. */
export function ImportsScreen() {
	const {
		state: { runs },
	} = useImports();

	return (
		<>
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderTitle>Imports</PageHeaderTitle>
					<PageHeaderActions>
						<Link className={buttonVariants()} href="/imports/new">
							<UploadIcon />
							New import
						</Link>
					</PageHeaderActions>
				</PageHeaderHeading>
				<PageHeaderDescription>
					Drop a manifest and its files, review what changes, then apply it.
					Unchanged items are skipped, so re-importing a whole tree is safe.
				</PageHeaderDescription>
			</PageHeader>

			{runs.length > 0 ? (
				<RunsTable runs={runs} />
			) : (
				<div className="lip depth-md rounded-xl border-2 border-line bg-surface">
					<EmptyState
						action={
							<Link className={buttonVariants()} href="/imports/new">
								<UploadIcon />
								New import
							</Link>
						}
						description="Imports you start show up here with their diff and status."
						pose="peek"
						title="No imports yet"
					/>
				</div>
			)}
		</>
	);
}

function RunsTable({ runs }: { runs: readonly ImportRun[] }) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Import</TableHead>
					<TableHead>Target</TableHead>
					<TableHead>Diff</TableHead>
					<TableHead>State</TableHead>
					<TableHead>Started</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{runs.map((run) => {
					const counts = countByAction(run.items);
					return (
						<TableRow className="relative" key={run.id}>
							<TableCell>
								{/* The link's ::after covers the row, so the whole row opens the run. */}
								<Link
									className="block font-semibold text-ink outline-none after:absolute after:inset-0 hover:underline focus-visible:after:outline-2 focus-visible:after:outline-focus focus-visible:after:-outline-offset-2"
									href={`/imports/${run.id}`}
								>
									{run.id}
								</Link>
								<span className="type-small block text-ink-muted">
									{run.files}
								</span>
							</TableCell>
							<TableCell>{TARGET_LABEL[run.target]}</TableCell>
							<TableCell>
								<span className="flex flex-wrap gap-2">
									{DIFF_ACTIONS.filter(
										(action) => action !== "unchanged" && counts[action] > 0
									).map((action) => (
										<span className="flex items-center gap-1" key={action}>
											<ActionBadge action={action} />
											<span className="type-small text-ink tabular-nums">
												{counts[action]}
											</span>
										</span>
									))}
								</span>
							</TableCell>
							<TableCell>
								<RunStateBadge run={run} />
							</TableCell>
							<TableCell className="text-ink-muted tabular-nums">
								{formatDate(run.createdAt)} · {run.createdBy}
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}

/** Review and discarded have no item status, so they get their own badge. */
function RunStateBadge({ run }: { run: ImportRun }) {
	if (run.state === "review") {
		return (
			<Badge variant="lavender">
				<EyeIcon />
				In review
			</Badge>
		);
	}
	if (run.state === "discarded") {
		return (
			<Badge>
				<CircleSlashIcon />
				Discarded
			</Badge>
		);
	}
	if (run.state === "applying") {
		return <StatusBadge status="processing" />;
	}
	return (
		<StatusBadge status={countByStatus(run.items).failed ? "failed" : "live"} />
	);
}
