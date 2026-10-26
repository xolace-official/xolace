"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@xolace/ui/components/alert";
import { Badge } from "@xolace/ui/components/badge";
import { Button } from "@xolace/ui/components/button";
import {
	BookOpenTextIcon,
	ClockAlertIcon,
	ExternalLinkIcon,
	ImageIcon,
	OctagonAlertIcon,
	PencilIcon,
	PlusIcon,
	RotateCwIcon,
	Trash2Icon,
	UploadIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/features/content/status-badge";

import { isStale } from "../citations";
import { useLibrary } from "../library-provider";
import {
	type EntryCredit,
	formatDate,
	formatDuration,
	humanize,
	KIND_LABEL,
} from "../types";
import { CreditDialog } from "./credit-dialog";
import { useEntryEditor } from "./entry-editor-provider";

/** Cover thumbnail with Replace. Uploads land with diceui file-upload (admin step 3). */
export function CoverPanel() {
	const {
		state: { entry },
	} = useEntryEditor();

	return (
		<div className="flex flex-col gap-3">
			<div className="grid aspect-[16/10] place-items-center rounded-lg border-2 border-line border-dashed bg-surface-sunken text-ink-muted">
				<div className="flex flex-col items-center gap-2">
					<ImageIcon aria-hidden className="size-8 stroke-2" />
					<span className="type-small">
						{entry.hasCover ? "Cover uploaded" : "No cover: uses the subject's"}
					</span>
				</div>
			</div>
			<Button
				onClick={() => toast("Uploads arrive with the import step")}
				size="sm"
				variant="outline"
			>
				<UploadIcon />
				{entry.hasCover ? "Replace cover" : "Upload cover"}
			</Button>
		</div>
	);
}

/** Narrated clip: status, length, transcript, and Retry when processing failed. */
export function NarrationPanel() {
	const {
		state: { entry },
	} = useEntryEditor();
	const { narration } = entry;

	if (!narration) {
		return (
			<div className="flex flex-col gap-3">
				<p className="type-small text-ink-muted">
					No narration for this entry.
				</p>
				<Button
					onClick={() => toast("Uploads arrive with the import step")}
					size="sm"
					variant="outline"
				>
					<UploadIcon />
					Add narration
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center gap-2">
				<StatusBadge status={narration.status} />
				<span className="type-small text-ink-muted tabular-nums">
					{formatDuration(narration.durationSec)} ·{" "}
					{narration.hasTranscript ? "transcript" : "no transcript"}
				</span>
			</div>
			{narration.failure ? (
				<Alert variant="coral">
					<OctagonAlertIcon />
					<AlertTitle>{narration.failure.step} failed</AlertTitle>
					<AlertDescription className="break-words">
						{narration.failure.message}
					</AlertDescription>
				</Alert>
			) : null}
			{narration.status === "failed" ? (
				<Button
					onClick={() => toast("Retry queued (fixture)")}
					size="sm"
					variant="warning"
				>
					<RotateCwIcon />
					Retry
				</Button>
			) : null}
		</div>
	);
}

/** Pages this entry draws on, with the publisher's credit line. Add, edit, remove. */
export function CreditsList() {
	const {
		actions: { setField },
		state: { entry, sources },
	} = useEntryEditor();
	const {
		meta: { now },
	} = useLibrary();
	// Which credit the dialog is open for: an index, "new", or closed.
	const [editing, setEditing] = useState<number | "new" | null>(null);

	const submit = (credit: EntryCredit) =>
		setField(
			"credits",
			editing === "new" || editing === null
				? [...entry.credits, credit]
				: entry.credits.map((c, i) => (i === editing ? credit : c))
		);

	return (
		<div className="flex flex-col gap-3">
			{entry.credits.length === 0 ? (
				<p className="type-small text-coral-text">
					No sources credited. Every entry needs at least one, even originals
					(credit Xolace).
				</p>
			) : (
				<ol className="flex flex-col gap-3">
					{entry.credits.map((credit, index) => {
						const source = sources.find((s) => s.slug === credit.source);
						return (
							<li
								className="flex flex-col gap-1 rounded-md border-2 border-line bg-surface p-3"
								// A publisher can repeat, but not with the same page.
								key={`${credit.source}:${credit.pageUrl ?? credit.pageTitle}`}
							>
								<span className="flex items-center justify-between gap-2">
									<Link
										className="type-eyebrow text-ink-muted hover:underline"
										href={`/library/sources/${credit.source}`}
									>
										{source?.name ?? credit.source}
									</Link>
									{isStale(credit, entry, source, now) ? (
										<Badge variant="ember">
											<ClockAlertIcon />
											Stale
										</Badge>
									) : null}
								</span>
								{credit.pageUrl ? (
									<a
										className="type-body-strong inline-flex items-start gap-1 text-ink hover:underline"
										href={credit.pageUrl}
										rel="noreferrer"
										target="_blank"
									>
										{credit.pageTitle}
										<ExternalLinkIcon
											aria-hidden
											className="mt-1 size-3.5 shrink-0"
										/>
									</a>
								) : (
									<span className="type-body-strong text-ink">
										{credit.pageTitle}
									</span>
								)}
								{credit.author ? (
									<span className="type-small text-ink-muted">
										{credit.author}
									</span>
								) : null}
								<span className="mt-1 flex gap-2">
									<Button
										onClick={() => setEditing(index)}
										size="xs"
										variant="outline"
									>
										<PencilIcon />
										Edit
									</Button>
									<Button
										aria-label={`Remove ${credit.pageTitle}`}
										onClick={() =>
											setField(
												"credits",
												entry.credits.filter((_, i) => i !== index)
											)
										}
										size="xs"
										variant="ghost"
									>
										<Trash2Icon />
										Remove
									</Button>
								</span>
							</li>
						);
					})}
				</ol>
			)}
			<Button onClick={() => setEditing("new")} size="sm" variant="outline">
				<PlusIcon />
				Add credit
			</Button>
			{editing === null ? null : (
				<CreditDialog
					credit={editing === "new" ? undefined : entry.credits[editing]}
					key={String(editing)}
					now={now}
					onOpenChange={(open) => {
						if (!open) {
							setEditing(null);
						}
					}}
					onSubmit={submit}
					open
					sources={sources}
				/>
			)}
		</div>
	);
}

/** "Explainer · Anxiety · adapted · 6 min read · updated 3 Oct 2026" */
export function EntryFacts() {
	const {
		state: { saved },
	} = useEntryEditor();

	return (
		<>
			<StatusBadge status={saved.status} />
			<span className="inline-flex items-center gap-1">
				<BookOpenTextIcon aria-hidden className="size-4" />
				{KIND_LABEL[saved.kind]}
			</span>
			<span aria-hidden>·</span>
			<span>{humanize(saved.primarySubject)}</span>
			<span aria-hidden>·</span>
			<span>{saved.reuse}</span>
			<span aria-hidden>·</span>
			<span>{saved.readMin} min read</span>
			<span aria-hidden>·</span>
			<span>updated {formatDate(saved.updatedAt)}</span>
		</>
	);
}
