"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@xolace/ui/components/alert";
import { Badge } from "@xolace/ui/components/badge";
import { Checkbox } from "@xolace/ui/components/checkbox";
import { cn } from "@xolace/ui/lib/utils";
import {
	BanIcon,
	EqualIcon,
	FileAudioIcon,
	FileImageIcon,
	PencilIcon,
	PlusIcon,
	TriangleAlertIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { diffLines, toHunks } from "../line-diff";
import {
	type DiffAction,
	type FieldChange,
	formatBytes,
	type ImportItem,
	type MediaFile,
	RECORD_LABEL,
} from "../types";
import { useImportRun } from "./import-run-provider";

const ACTION: Record<
	DiffAction,
	{
		icon: ReactNode;
		label: string;
		tone: "mint" | "sky" | "neutral" | "coral";
	}
> = {
	changed: { icon: <PencilIcon />, label: "Changed", tone: "sky" },
	new: { icon: <PlusIcon />, label: "New", tone: "mint" },
	rejected: { icon: <BanIcon />, label: "Rejected", tone: "coral" },
	unchanged: { icon: <EqualIcon />, label: "Unchanged", tone: "neutral" },
};

/** Word plus icon, like StatusBadge. */
export function ActionBadge({
	action,
	className,
}: {
	action: DiffAction;
	className?: string;
}) {
	const { icon, label, tone } = ACTION[action];
	return (
		<Badge className={className} variant={tone}>
			{icon}
			{label}
		</Badge>
	);
}

/** "Entry · sleep-why-it-matters" under an item's title. */
export function ItemKey({ item }: { item: ImportItem }) {
	return (
		<span className="type-small truncate text-ink-muted">
			{RECORD_LABEL[item.type]} · <code className="font-mono">{item.slug}</code>
		</span>
	);
}

/** Keep or leave out a new/changed item. Rejected and unchanged items have nothing to apply. */
export function IncludeCheckbox({
	item,
	className,
}: {
	item: ImportItem;
	className?: string;
}) {
	const {
		actions,
		state: { run },
	} = useImportRun();
	if (item.action !== "new" && item.action !== "changed") {
		// Same footprint as the checkbox, so rows stay aligned in mixed lists.
		return <span aria-hidden className={cn("size-6 shrink-0", className)} />;
	}
	return (
		<Checkbox
			aria-label={`Include ${item.title}`}
			checked={!item.skipped}
			className={className}
			disabled={run.state !== "review"}
			onCheckedChange={(checked) => actions.setSkipped([item.id], !checked)}
		/>
	);
}

/** Everything the reviewer needs to judge one item: gates, field diffs, media. */
export function ItemDetail({ item }: { item: ImportItem }) {
	return (
		<div className="flex flex-col gap-4">
			<ItemNotes item={item} />
			{item.changes?.length ? <FieldChanges changes={item.changes} /> : null}
			{item.action === "new" ? (
				<p className="type-body text-ink-muted">
					New {RECORD_LABEL[item.type].toLowerCase()}. Nothing is stored under
					this slug yet.
				</p>
			) : null}
			{item.action === "unchanged" ? (
				<p className="type-body text-ink-muted">
					Every field matches what's stored. Applying skips it.
				</p>
			) : null}
			{item.media?.length ? <MediaList media={item.media} /> : null}
		</div>
	);
}

export function ItemNotes({ item }: { item: ImportItem }) {
	return (
		<>
			{item.rejection ? (
				<Alert variant="coral">
					<BanIcon />
					<AlertTitle>Can't import</AlertTitle>
					<AlertDescription>{item.rejection}</AlertDescription>
				</Alert>
			) : null}
			{item.warnings?.map((warning) => (
				<Alert key={warning} variant="ember">
					<TriangleAlertIcon />
					<AlertTitle>Heads up</AlertTitle>
					<AlertDescription>{warning}</AlertDescription>
				</Alert>
			))}
		</>
	);
}

/** Short fields as before → after rows; long text as a folded line diff. */
export function FieldChanges({ changes }: { changes: readonly FieldChange[] }) {
	return (
		<dl className="flex flex-col gap-4">
			{changes.map((change) => (
				<div className="flex flex-col gap-2" key={change.field}>
					<dt className="type-eyebrow text-ink-muted">{change.field}</dt>
					<dd>
						{change.long ? (
							<TextDiff
								after={change.after ?? ""}
								before={change.before ?? ""}
							/>
						) : (
							<ValueDiff after={change.after} before={change.before} />
						)}
					</dd>
				</div>
			))}
		</dl>
	);
}

function ValueDiff({ before, after }: { before?: string; after?: string }) {
	return (
		<div className="flex flex-col gap-1 overflow-hidden rounded-md border-2 border-line">
			<DiffRow kind="removed">{before ?? "Not set"}</DiffRow>
			<DiffRow kind="added">{after ?? "Removed"}</DiffRow>
		</div>
	);
}

function DiffRow({
	kind,
	children,
}: {
	kind: "added" | "removed" | "same";
	children: ReactNode;
}) {
	const sign = { added: "+", removed: "−", same: " " }[kind];
	return (
		<div
			className={cn(
				"type-body grid grid-cols-[1.5rem_1fr] px-2 py-1",
				kind === "added" && "bg-mint-soft text-ink",
				kind === "removed" &&
					"bg-coral-soft text-ink-muted line-through decoration-coral-text/40",
				kind === "same" && "text-ink-muted"
			)}
		>
			<span
				aria-hidden
				className={cn(
					"select-none font-bold font-mono",
					kind === "added" && "text-mint-text",
					kind === "removed" && "text-coral-text"
				)}
			>
				{sign}
			</span>
			<span className="sr-only">
				{kind === "added" ? "Added: " : null}
				{kind === "removed" ? "Removed: " : null}
			</span>
			<span className="min-w-0 whitespace-pre-wrap break-words">
				{children}
			</span>
		</div>
	);
}

/** Markdown bodies and transcripts: changed lines with two lines of context. */
export function TextDiff({ before, after }: { before: string; after: string }) {
	const hunks = toHunks(diffLines(before, after));
	return (
		<div className="overflow-hidden rounded-md border-2 border-line">
			{hunks.map((hunk, index) =>
				hunk.kind === "skip" ? (
					<div
						className="bg-surface-sunken px-3 py-1 font-sans text-ink-muted text-xs"
						// Hunks have no identity beyond their place in this one diff.
						// biome-ignore lint/suspicious/noArrayIndexKey: static list, never reordered
						key={index}
					>
						{hunk.count} unchanged {hunk.count === 1 ? "line" : "lines"}
					</div>
				) : (
					// biome-ignore lint/suspicious/noArrayIndexKey: static list, never reordered
					<div key={index}>
						{hunk.lines.map((line, lineIndex) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: lines repeat (blank lines), position is the identity
							<DiffRow key={lineIndex} kind={line.kind}>
								{line.text || " "}
							</DiffRow>
						))}
					</div>
				)
			)}
		</div>
	);
}

const MEDIA_ICON: Record<MediaFile["kind"], ReactNode> = {
	audio: <FileAudioIcon />,
	cover: <FileImageIcon />,
	thumb: <FileImageIcon />,
};

/** Files uploaded for this item, written when it's applied. */
export function MediaList({ media }: { media: readonly MediaFile[] }) {
	return (
		<div className="flex flex-col gap-2">
			<span className="type-eyebrow text-ink-muted">Uploads</span>
			<ul className="flex flex-col gap-2">
				{media.map((file) => (
					<li
						className="flex items-center gap-3 rounded-md border-2 border-line bg-surface px-3 py-2"
						key={file.name}
					>
						<span className="grid size-8 shrink-0 place-items-center rounded-sm bg-lavender-soft text-lavender-text [&_svg]:size-4 [&_svg]:stroke-[2.5]">
							{MEDIA_ICON[file.kind]}
						</span>
						<span className="type-body min-w-0 flex-1 truncate text-ink">
							{file.name}
						</span>
						<span className="type-small text-ink-muted">
							{formatBytes(file.bytes)}
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}
