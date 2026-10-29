"use client";

import { Badge } from "@xolace/ui/components/badge";
import { buttonVariants } from "@xolace/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@xolace/ui/components/card";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemTitle,
} from "@xolace/ui/components/item";
import { cn } from "@xolace/ui/lib/utils";
import {
	AudioLinesIcon,
	BellRingIcon,
	BookOpenTextIcon,
	ChevronRightIcon,
	ClockAlertIcon,
	EyeOffIcon,
	HandshakeIcon,
	HourglassIcon,
	LibraryBigIcon,
	type LucideIcon,
	OctagonAlertIcon,
	PlusIcon,
	ShieldAlertIcon,
	UploadIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { useAudio } from "@/features/audio/audio-provider";
import { StatCard } from "@/features/dashboard/stat-card";
import { EmptyState } from "@/features/flux/empty-state";
import { useImports } from "@/features/imports/imports-provider";
import { RunStateBadge } from "@/features/imports/imports-screen";
import { runLabel, TARGET_LABEL } from "@/features/imports/types";
import { useLibrary } from "@/features/library/library-provider";
import { formatDate } from "@/features/library/types";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderDescription,
	PageHeaderHeading,
	PageHeaderTitle,
} from "@/features/shell/page-header";

import {
	ATTENTION_HEADING,
	ATTENTION_KINDS,
	type AttentionItem,
	type AttentionKind,
	needsAttention,
} from "./attention";

const RECENT_RUNS = 4;

const KIND_STYLE: Record<AttentionKind, { icon: LucideIcon; tone: string }> = {
	consent: { icon: HandshakeIcon, tone: "bg-ember-soft text-ember-text" },
	failed: { icon: OctagonAlertIcon, tone: "bg-coral-soft text-coral-text" },
	hub: { icon: EyeOffIcon, tone: "bg-sky-soft text-sky-text" },
	permission: { icon: HourglassIcon, tone: "bg-ember-soft text-ember-text" },
	safety: { icon: ShieldAlertIcon, tone: "bg-ember-soft text-ember-text" },
	stale: { icon: ClockAlertIcon, tone: "bg-ember-soft text-ember-text" },
};

/** `/`: what needs someone, how much is live, and the latest imports. */
export function OverviewScreen() {
	const library = useLibrary();
	const {
		state: { tracks },
	} = useAudio();
	const {
		state: { runs },
	} = useImports();
	const { entries, hubs, sources } = library.state;
	const attention = needsAttention({
		entries,
		hubs,
		now: library.meta.now,
		runs,
		sources,
		tracks,
	});
	const live = <T extends { status: string }>(items: readonly T[]) =>
		items.filter((item) => item.status === "live").length;

	return (
		<>
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderTitle>Overview</PageHeaderTitle>
					<PageHeaderActions>
						<Link
							className={buttonVariants({ variant: "outline" })}
							href="/imports/new"
						>
							<UploadIcon />
							New import
						</Link>
						<Link className={buttonVariants()} href="/library/new">
							<PlusIcon />
							New entry
						</Link>
					</PageHeaderActions>
				</PageHeaderHeading>
				<PageHeaderDescription>
					What needs someone across Library and Audio, and the latest imports.
				</PageHeaderDescription>
			</PageHeader>

			<div className="flex flex-col gap-8">
				<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
					<StatCard
						icon={<BookOpenTextIcon />}
						label="Live entries"
						value={<OfTotal live={live(entries)} total={entries.length} />}
					/>
					<StatCard
						icon={<LibraryBigIcon />}
						label="Live hubs"
						tone="pink"
						value={<OfTotal live={live(hubs)} total={hubs.length} />}
					/>
					<StatCard
						icon={<AudioLinesIcon />}
						label="Live tracks"
						tone="sky"
						value={<OfTotal live={live(tracks)} total={tracks.length} />}
					/>
					<StatCard
						icon={<BellRingIcon />}
						label="Needs attention"
						tone={attention.length > 0 ? "coral" : "mint"}
						value={attention.length}
					/>
				</div>

				<div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
					<Card>
						<CardHeader>
							<CardTitle>Needs attention</CardTitle>
							<CardDescription>
								The same checks the editors run, across everything.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{attention.length === 0 ? (
								<EmptyState
									description="Nothing failed, waiting on review or past its refresh."
									pose="celebrate"
									title="All clear"
								/>
							) : (
								<AttentionList items={attention} />
							)}
						</CardContent>
					</Card>

					<Card size="sm">
						<CardHeader>
							<CardTitle>Recent imports</CardTitle>
						</CardHeader>
						<CardContent>
							{runs.length === 0 ? (
								<p className="type-small text-ink-muted">No imports yet.</p>
							) : (
								<ItemGroup>
									{runs.slice(0, RECENT_RUNS).map((run) => (
										<li key={run.number}>
											<Item
												render={<Link href={`/imports/${run.number}`} />}
												size="sm"
												variant="outline"
											>
												<ItemContent>
													<ItemTitle>{runLabel(run)}</ItemTitle>
													<ItemDescription>
														{TARGET_LABEL[run.target]} ·{" "}
														{formatDate(run.createdAt)}
													</ItemDescription>
												</ItemContent>
												<ItemActions>
													<RunStateBadge run={run} />
												</ItemActions>
											</Item>
										</li>
									))}
								</ItemGroup>
							)}
						</CardContent>
						<CardFooter>
							<Link
								className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}
								href="/imports"
							>
								All imports
								<ChevronRightIcon />
							</Link>
						</CardFooter>
					</Card>
				</div>
			</div>
		</>
	);
}

function OfTotal({ live, total }: { live: number; total: number }): ReactNode {
	return (
		<>
			{live}
			<span className="type-body text-ink-muted"> of {total}</span>
		</>
	);
}

/** Grouped by rule, in order of how much it hurts readers. */
function AttentionList({ items }: { items: readonly AttentionItem[] }) {
	return (
		<div className="flex flex-col gap-6">
			{ATTENTION_KINDS.map((kind) => {
				const group = items.filter((item) => item.kind === kind);
				if (group.length === 0) {
					return null;
				}
				const { icon: Icon, tone } = KIND_STYLE[kind];
				return (
					<section aria-labelledby={`attention-${kind}`} key={kind}>
						<h3
							className="type-eyebrow mb-2 flex items-center gap-2 text-ink-muted"
							id={`attention-${kind}`}
						>
							{ATTENTION_HEADING[kind]}
							<Badge>{group.length}</Badge>
						</h3>
						<ItemGroup className="gap-2">
							{group.map((item) => (
								<li key={item.id}>
									<Item
										// Hrefs are built from the routes in attention.ts.
										render={<Link href={item.href as Route} />}
										size="sm"
										variant="outline"
									>
										<ItemMedia className={tone} variant="icon">
											<Icon />
										</ItemMedia>
										<ItemContent>
											<ItemTitle>{item.title}</ItemTitle>
											<ItemDescription>{item.reason}</ItemDescription>
										</ItemContent>
										<ItemActions>
											<ChevronRightIcon
												aria-hidden
												className="size-4 text-ink-muted"
											/>
										</ItemActions>
									</Item>
								</li>
							))}
						</ItemGroup>
					</section>
				);
			})}
		</div>
	);
}
