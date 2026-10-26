"use client";

import { Button, buttonVariants } from "@xolace/ui/components/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@xolace/ui/components/input-group";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@xolace/ui/components/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@xolace/ui/components/table";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@xolace/ui/components/toggle-group";
import { HeadphonesIcon, PlusIcon, SearchIcon, UploadIcon } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/features/content/status-badge";
import { EmptyState } from "@/features/flux/empty-state";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderDescription,
	PageHeaderHeading,
	PageHeaderTitle,
} from "@/features/shell/page-header";

import {
	ENTRY_STATUSES,
	filterEntries,
	useEntryFilters,
} from "./entry-filters";
import { useLibrary } from "./library-provider";
import {
	ENTRY_KINDS,
	formatDate,
	formatDuration,
	humanize,
	KIND_LABEL,
	type LibraryEntry,
} from "./types";

const STATUS_LABEL: Record<(typeof ENTRY_STATUSES)[number], string> = {
	draft: "Draft",
	failed: "Failed",
	live: "Live",
	needs_review: "Needs review",
	processing: "Processing",
	retired: "Retired",
};

/** `/library`: every entry, filtered by kind, status, subject and search (all in the URL). */
export function EntriesScreen() {
	const {
		state: { entries },
	} = useLibrary();
	const [filters, setFilters] = useEntryFilters();
	const visible = filterEntries(entries, filters);
	const filtered =
		filters.q !== "" || filters.kind || filters.status || filters.subject;

	return (
		<>
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderTitle>Entries</PageHeaderTitle>
					<PageHeaderActions>
						<Link
							className={buttonVariants({ variant: "outline" })}
							href="/imports"
						>
							<UploadIcon />
							Import
						</Link>
						<Link className={buttonVariants()} href="/library/new">
							<PlusIcon />
							New entry
						</Link>
					</PageHeaderActions>
				</PageHeaderHeading>
				<PageHeaderDescription>
					Explainers, advice and stories in the Library. Open one to edit,
					review and publish it.
				</PageHeaderDescription>
			</PageHeader>

			<div className="flex flex-col gap-6">
				<EntriesToolbar entries={entries} />
				{visible.length > 0 ? (
					<EntriesTable entries={visible} />
				) : (
					<div className="lip depth-md rounded-xl border-2 border-line bg-surface">
						<EmptyState
							action={
								filtered ? (
									<Button onClick={() => setFilters(null)} variant="outline">
										Clear filters
									</Button>
								) : undefined
							}
							description={
								filtered
									? "No entry matches these filters."
									: "Import a batch or add an entry to start the Library."
							}
							pose="writer"
							title={filtered ? "Nothing matches" : "No entries yet"}
						/>
					</div>
				)}
				<p aria-live="polite" className="type-small text-ink-muted">
					Showing {visible.length} of {entries.length} entries
				</p>
			</div>
		</>
	);
}

function EntriesToolbar({ entries }: { entries: readonly LibraryEntry[] }) {
	const [filters, setFilters] = useEntryFilters();
	const subjects = [...new Set(entries.map((e) => e.primarySubject))].sort();
	const subjectItems = [
		{ label: "All subjects", value: null },
		...subjects.map((slug) => ({ label: humanize(slug), value: slug })),
	];
	const statusItems = [
		{ label: "Any status", value: null },
		...ENTRY_STATUSES.map((status) => ({
			label: STATUS_LABEL[status],
			value: status,
		})),
	];

	return (
		<div className="flex flex-col gap-4">
			<ToggleGroup
				aria-label="Kind"
				onValueChange={(value) => {
					const next = ENTRY_KINDS.find((kind) => kind === value[0]);
					setFilters({ kind: next ?? null });
				}}
				size="sm"
				value={[filters.kind ?? "all"]}
			>
				<ToggleGroupItem value="all">
					All <KindCount count={entries.length} />
				</ToggleGroupItem>
				{ENTRY_KINDS.map((kind) => (
					<ToggleGroupItem key={kind} value={kind}>
						{KIND_LABEL[kind]}
						<KindCount
							count={entries.filter((entry) => entry.kind === kind).length}
						/>
					</ToggleGroupItem>
				))}
			</ToggleGroup>

			<div className="flex flex-col gap-3 md:flex-row">
				<InputGroup className="md:max-w-sm">
					<InputGroupAddon>
						<SearchIcon />
					</InputGroupAddon>
					<InputGroupInput
						aria-label="Search entries"
						onChange={(event) => setFilters({ q: event.target.value })}
						placeholder="Search title, dek or slug"
						type="search"
						value={filters.q}
					/>
				</InputGroup>
				<Select
					items={statusItems}
					onValueChange={(status) =>
						setFilters({
							status: ENTRY_STATUSES.find((s) => s === status) ?? null,
						})
					}
					value={filters.status}
				>
					<SelectTrigger aria-label="Status" className="md:w-48">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{statusItems.map((item) => (
								<SelectItem key={item.label} value={item.value}>
									{item.label}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
				<Select
					items={subjectItems}
					onValueChange={(subject) => setFilters({ subject })}
					value={filters.subject}
				>
					<SelectTrigger aria-label="Subject" className="md:w-60">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{subjectItems.map((item) => (
								<SelectItem key={item.label} value={item.value}>
									{item.label}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}

function KindCount({ count }: { count: number }) {
	return (
		<span className="inline-grid h-5 min-w-5 place-items-center rounded-full bg-surface-sunken in-aria-pressed:bg-lavender px-1.5 font-sans in-aria-pressed:text-on-lavender text-ink-muted text-xs tracking-normal">
			{count}
		</span>
	);
}

function EntriesTable({ entries }: { entries: readonly LibraryEntry[] }) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Entry</TableHead>
					<TableHead>Kind</TableHead>
					<TableHead>Subject</TableHead>
					<TableHead>Status</TableHead>
					<TableHead className="text-right">Sources</TableHead>
					<TableHead>Narration</TableHead>
					<TableHead>Updated</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{entries.map((entry) => (
					<TableRow className="relative" key={entry.slug}>
						<TableCell className="max-w-md">
							{/* The link's ::after covers the row, so the whole row opens the entry. */}
							<Link
								className="block truncate font-semibold text-ink outline-none after:absolute after:inset-0 hover:underline focus-visible:after:outline-2 focus-visible:after:outline-focus focus-visible:after:-outline-offset-2"
								href={`/library/${entry.slug}`}
							>
								{entry.title}
							</Link>
							<span className="type-small block truncate text-ink-muted">
								{entry.dek}
							</span>
						</TableCell>
						<TableCell>{KIND_LABEL[entry.kind]}</TableCell>
						<TableCell className="text-ink-muted">
							{humanize(entry.primarySubject)}
						</TableCell>
						<TableCell>
							<StatusBadge status={entry.status} />
						</TableCell>
						<TableCell className="text-right tabular-nums">
							{entry.credits.length}
						</TableCell>
						<TableCell>
							<NarrationCell entry={entry} />
						</TableCell>
						<TableCell className="text-ink-muted tabular-nums">
							{formatDate(entry.updatedAt)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function NarrationCell({ entry }: { entry: LibraryEntry }) {
	const { narration } = entry;
	if (!narration) {
		return (
			<span className="text-ink-muted">
				<span aria-hidden>—</span>
				<span className="sr-only">None</span>
			</span>
		);
	}
	if (narration.status !== "live") {
		return <StatusBadge status={narration.status} />;
	}
	return (
		<span className="inline-flex items-center gap-1.5 tabular-nums">
			<HeadphonesIcon aria-hidden className="size-4 text-ink-muted" />
			{formatDuration(narration.durationSec)}
		</span>
	);
}
