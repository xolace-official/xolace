"use client";

import { Button } from "@xolace/ui/components/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@xolace/ui/components/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@xolace/ui/components/collapsible";
import { ChevronDownIcon, TriangleAlertIcon } from "lucide-react";

import type { DiffAction, ImportItem } from "../types";
import {
	ActionBadge,
	IncludeCheckbox,
	ItemDetail,
	ItemKey,
} from "./diff-parts";
import { useImportRun } from "./import-run-provider";

const SECTIONS: { action: DiffAction; description: string; title: string }[] = [
	{
		action: "rejected",
		description: "Blocked by a hard gate. Fix the files and import again.",
		title: "Rejected",
	},
	{
		action: "changed",
		description: "Stored already; these fields differ.",
		title: "Changed",
	},
	{
		action: "new",
		description: "Nothing stored under these slugs yet.",
		title: "New",
	},
];

/**
 * A run's diff as one column of sections (Rejected, Changed, New), each item a row
 * that expands in place to its field diffs. Unchanged folds away at the end. Picked
 * from three prototypes; the others are on `prototype/admin-import-review-layouts`.
 */
export function ReviewList() {
	const {
		state: { byAction },
	} = useImportRun();
	return (
		<div className="flex flex-col gap-8">
			{SECTIONS.filter(({ action }) => byAction[action].length > 0).map(
				(section) => (
					<ReviewSection key={section.action} {...section} />
				)
			)}
			<UnchangedSection />
		</div>
	);
}

function ReviewSection({
	action,
	title,
	description,
}: {
	action: DiffAction;
	title: string;
	description: string;
}) {
	const {
		actions,
		state: { byAction },
	} = useImportRun();
	const items = byAction[action];
	const selectable = action === "new" || action === "changed";
	const allIncluded = items.every((item) => !item.skipped);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-3">
					{title}
					<ActionBadge action={action} />
					<span className="type-body text-ink-muted">{items.length}</span>
				</CardTitle>
				<CardDescription>{description}</CardDescription>
				{selectable ? (
					<CardAction>
						<Button
							onClick={() =>
								actions.setSkipped(
									items.map((item) => item.id),
									allIncluded
								)
							}
							size="sm"
							variant="outline"
						>
							{allIncluded ? "Leave all out" : "Include all"}
						</Button>
					</CardAction>
				) : null}
			</CardHeader>
			<CardContent>
				<ul className="flex flex-col gap-3">
					{items.map((item) => (
						<ReviewRow item={item} key={item.id} />
					))}
				</ul>
			</CardContent>
		</Card>
	);
}

function ReviewRow({ item }: { item: ImportItem }) {
	return (
		<li>
			<Collapsible
				className="rounded-lg border-2 border-line bg-surface data-[open]:border-line-strong"
				defaultOpen={item.action === "rejected"}
			>
				<div className="flex items-center gap-3 px-3 py-2.5">
					<IncludeCheckbox item={item} />
					<CollapsibleTrigger className="group/row flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md text-left outline-none focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2">
						<span className="flex min-w-0 flex-1 flex-col">
							<span
								className={
									item.skipped
										? "type-body-strong truncate text-ink-muted line-through"
										: "type-body-strong truncate text-ink"
								}
							>
								{item.title}
							</span>
							<ItemKey item={item} />
						</span>
						{item.warnings?.length ? (
							<span className="type-small flex items-center gap-1 text-ember-text">
								<TriangleAlertIcon
									aria-hidden
									className="size-4 stroke-[2.5]"
								/>
								{item.warnings.length === 1
									? "1 note"
									: `${item.warnings.length} notes`}
							</span>
						) : null}
						{item.changes?.length ? (
							<span className="type-small text-ink-muted">
								{item.changes.map((change) => change.field).join(", ")}
							</span>
						) : null}
						<ChevronDownIcon
							aria-hidden
							className="size-5 shrink-0 stroke-[2.5] text-ink-muted transition-transform group-data-[panel-open]/row:rotate-180"
						/>
					</CollapsibleTrigger>
				</div>
				<CollapsibleContent className="border-line border-t-2 px-4 py-4">
					<ItemDetail item={item} />
				</CollapsibleContent>
			</Collapsible>
		</li>
	);
}

function UnchangedSection() {
	const {
		state: { byAction },
	} = useImportRun();
	const items = byAction.unchanged;
	if (items.length === 0) {
		return null;
	}
	return (
		<Collapsible className="rounded-xl border-2 border-line border-dashed">
			<CollapsibleTrigger className="group/unchanged flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left outline-none focus-visible:outline-2 focus-visible:outline-focus">
				<ActionBadge action="unchanged" />
				<span className="type-body flex-1 text-ink-muted">
					{items.length} items match what's stored and are skipped.
				</span>
				<ChevronDownIcon
					aria-hidden
					className="size-5 stroke-[2.5] text-ink-muted transition-transform group-data-[panel-open]/unchanged:rotate-180"
				/>
			</CollapsibleTrigger>
			<CollapsibleContent className="px-5 pb-4">
				<ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
					{items.map((item) => (
						<li className="flex min-w-0 flex-col py-1" key={item.id}>
							<span className="type-body truncate text-ink">{item.title}</span>
							<ItemKey item={item} />
						</li>
					))}
				</ul>
			</CollapsibleContent>
		</Collapsible>
	);
}
