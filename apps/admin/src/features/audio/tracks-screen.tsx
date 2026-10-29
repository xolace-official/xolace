"use client";

import { Badge } from "@xolace/ui/components/badge";
import { Button, buttonVariants } from "@xolace/ui/components/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@xolace/ui/components/input-group";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@xolace/ui/components/pagination";
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
import {
	PlusIcon,
	SearchIcon,
	SparklesIcon,
	StarIcon,
	UploadIcon,
} from "lucide-react";
import Link from "next/link";
import { Fragment, type MouseEvent } from "react";

import { StatusBadge } from "@/features/content/status-badge";
import { EmptyState } from "@/features/flux/empty-state";
import { formatDate, formatDuration } from "@/features/library/types";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderDescription,
	PageHeaderHeading,
	PageHeaderTitle,
} from "@/features/shell/page-header";

import { useAudio } from "./audio-provider";
import {
	filterTracks,
	PAGE_SIZE,
	serializeTrackFilters,
	TRACK_STATUSES,
	type TrackFilters,
	useTrackFilters,
} from "./track-filters";
import {
	type AudioTrack,
	FAMILY_LABEL,
	TRACK_FAMILIES,
	topicSlug,
} from "./types";

const STATUS_LABEL: Record<(typeof TRACK_STATUSES)[number], string> = {
	draft: "Draft",
	failed: "Failed",
	live: "Live",
	needs_review: "Needs review",
	processing: "Processing",
	retired: "Retired",
};

const TAGS_SHOWN = 2;

/** `/audio`: every support and music track, filtered and paged in the URL. */
export function TracksScreen() {
	const {
		state: { tracks },
	} = useAudio();
	const [filters, setFilters] = useTrackFilters();
	const visible = filterTracks(tracks, filters);
	const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
	const page = Math.min(Math.max(1, filters.page), pages);
	const rows = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
	const filtered =
		filters.q !== "" || filters.family || filters.status || filters.topic;

	return (
		<>
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderTitle>Tracks</PageHeaderTitle>
					<PageHeaderActions>
						<Link
							className={buttonVariants({ variant: "outline" })}
							href="/imports/new"
						>
							<UploadIcon />
							Import
						</Link>
						<Link className={buttonVariants()} href="/audio/new">
							<PlusIcon />
							New track
						</Link>
					</PageHeaderActions>
				</PageHeaderHeading>
				<PageHeaderDescription>
					Support audio and music for Kindling. Open one to edit its tags,
					licence and shelf.
				</PageHeaderDescription>
			</PageHeader>

			<div className="flex flex-col gap-6">
				<TracksToolbar />
				{rows.length > 0 ? (
					<TracksTable tracks={rows} />
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
									? "No track matches these filters."
									: "Import a batch or add a track to start the catalogue."
							}
							pose="writer"
							title={filtered ? "Nothing matches" : "No tracks yet"}
						/>
					</div>
				)}
				<div className="flex flex-col items-center justify-between gap-3 md:flex-row">
					<p aria-live="polite" className="type-small text-ink-muted">
						Showing {rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
						{(page - 1) * PAGE_SIZE + rows.length} of {visible.length} tracks
						{visible.length === tracks.length
							? null
							: ` (${tracks.length} in all)`}
					</p>
					{pages > 1 ? (
						<TracksPagination filters={filters} page={page} pages={pages} />
					) : null}
				</div>
			</div>
		</>
	);
}

function TracksToolbar() {
	const {
		state: { tracks, topics },
	} = useAudio();
	const [filters, setFilters] = useTrackFilters();
	const topicItems = [
		{ label: "All topics", value: null },
		...topics.map((topic) => ({ label: topic.title, value: topic.slug })),
	];
	const statusItems = [
		{ label: "Any status", value: null },
		...TRACK_STATUSES.map((status) => ({
			label: STATUS_LABEL[status],
			value: status,
		})),
	];

	return (
		<div className="flex flex-col gap-4">
			<ToggleGroup
				aria-label="Family"
				onValueChange={(value) => {
					const next = TRACK_FAMILIES.find((family) => family === value[0]);
					setFilters({ family: next ?? null, page: null });
				}}
				size="sm"
				value={[filters.family ?? "all"]}
			>
				<ToggleGroupItem value="all">
					All <FamilyCount count={tracks.length} />
				</ToggleGroupItem>
				{TRACK_FAMILIES.map((family) => (
					<ToggleGroupItem key={family} value={family}>
						{FAMILY_LABEL[family]}
						<FamilyCount
							count={tracks.filter((track) => track.family === family).length}
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
						aria-label="Search tracks"
						onChange={(event) =>
							setFilters({ page: null, q: event.target.value })
						}
						placeholder="Search title, tag or artist"
						type="search"
						value={filters.q}
					/>
				</InputGroup>
				<Select
					items={statusItems}
					onValueChange={(status) =>
						setFilters({
							page: null,
							status: TRACK_STATUSES.find((s) => s === status) ?? null,
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
					items={topicItems}
					onValueChange={(topic) => setFilters({ page: null, topic })}
					value={filters.topic}
				>
					<SelectTrigger aria-label="Topic" className="md:w-64">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{topicItems.map((item) => (
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

function FamilyCount({ count }: { count: number }) {
	return (
		<span className="inline-grid h-5 min-w-5 place-items-center rounded-full bg-surface-sunken in-aria-pressed:bg-lavender px-1.5 font-sans in-aria-pressed:text-on-lavender text-ink-muted text-xs tracking-normal">
			{count}
		</span>
	);
}

function TracksTable({ tracks }: { tracks: readonly AudioTrack[] }) {
	const {
		state: { topics },
		meta: { now },
	} = useAudio();
	const topicTitle = (track: AudioTrack) => {
		const slug = topicSlug(track.topic);
		return topics.find((topic) => topic.slug === slug)?.title ?? slug;
	};

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Track</TableHead>
					<TableHead>Family</TableHead>
					<TableHead>Topic</TableHead>
					<TableHead className="text-right">Length</TableHead>
					<TableHead>Tags</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Updated</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{tracks.map((track) => (
					<TableRow className="relative" key={track.slug}>
						<TableCell className="max-w-sm">
							<span className="flex items-center gap-2">
								{/* The link's ::after covers the row, so the whole row opens the track. */}
								<Link
									className="truncate font-semibold text-ink outline-none after:absolute after:inset-0 hover:underline focus-visible:after:outline-2 focus-visible:after:outline-focus focus-visible:after:-outline-offset-2"
									href={`/audio/${track.slug}`}
								>
									{track.title}
								</Link>
								{track.featured ? (
									<Badge variant="ember">
										<StarIcon />
										Featured
									</Badge>
								) : null}
								{track.newUntil && track.newUntil > now ? (
									<Badge variant="sky">
										<SparklesIcon />
										New
									</Badge>
								) : null}
							</span>
							<span className="type-small block truncate text-ink-muted">
								{track.licence?.artist ?? track.narrators?.join(", ") ?? (
									<code className="font-mono">{track.slug}</code>
								)}
							</span>
						</TableCell>
						<TableCell>{FAMILY_LABEL[track.family]}</TableCell>
						<TableCell className="text-ink-muted">
							{topicTitle(track)}
						</TableCell>
						<TableCell className="text-right tabular-nums">
							{formatDuration(track.durationSec)}
						</TableCell>
						<TableCell>
							<span className="flex items-center gap-1 whitespace-nowrap">
								{track.tags.slice(0, TAGS_SHOWN).map((tag) => (
									<Badge key={tag} variant="neutral">
										{tag}
									</Badge>
								))}
								{track.tags.length > TAGS_SHOWN ? (
									<span className="type-small text-ink-muted">
										+{track.tags.length - TAGS_SHOWN}
									</span>
								) : null}
							</span>
						</TableCell>
						<TableCell>
							<StatusBadge status={track.status} />
						</TableCell>
						<TableCell className="text-ink-muted tabular-nums">
							{formatDate(track.updatedAt)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

const PAGE_WINDOW = 2;

/** Real hrefs (open in a new tab works); a plain click updates the URL in place. */
function TracksPagination({
	filters,
	page,
	pages,
}: {
	filters: TrackFilters;
	page: number;
	pages: number;
}) {
	const [, setFilters] = useTrackFilters();
	const link = (target: number) => ({
		href: serializeTrackFilters("/audio", { ...filters, page: target }),
		onClick: (event: MouseEvent) => {
			if (event.metaKey || event.ctrlKey || event.shiftKey) {
				return;
			}
			event.preventDefault();
			setFilters({ page: target === 1 ? null : target });
		},
	});
	const numbers = Array.from({ length: pages }, (_, index) => index + 1).filter(
		(n) => n === 1 || n === pages || Math.abs(n - page) <= PAGE_WINDOW
	);

	return (
		<Pagination className="mx-0 w-auto">
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						aria-disabled={page === 1}
						className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
						{...link(Math.max(1, page - 1))}
					/>
				</PaginationItem>
				{numbers.map((n, index) => (
					<Fragment key={n}>
						{index > 0 && n - (numbers[index - 1] ?? n) > 1 ? (
							<PaginationItem>
								<PaginationEllipsis />
							</PaginationItem>
						) : null}
						<PaginationItem>
							<PaginationLink isActive={n === page} {...link(n)}>
								{n}
							</PaginationLink>
						</PaginationItem>
					</Fragment>
				))}
				<PaginationItem>
					<PaginationNext
						aria-disabled={page === pages}
						className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
						{...link(Math.min(pages, page + 1))}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}
