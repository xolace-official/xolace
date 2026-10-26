"use client";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@xolace/ui/components/table";
import Link from "next/link";

import {
	PageHeader,
	PageHeaderActions,
	PageHeaderDescription,
	PageHeaderHeading,
	PageHeaderTitle,
} from "@/features/shell/page-header";

import { citationsOf } from "../citations";
import { useLibrary } from "../library-provider";
import { NewSourceDialog } from "./new-source-dialog";
import { PermissionBadge, StaleBadge } from "./source-badges";

const WWW = /^www\./;

function hostOf(url?: string) {
	if (!url) {
		return null;
	}
	try {
		return new URL(url).host.replace(WWW, "");
	} catch {
		return url;
	}
}

/** `/library/sources`: every publisher we credit, with terms and freshness. */
export function SourcesScreen() {
	const {
		state: { entries, sources },
		meta: { now },
	} = useLibrary();
	const rows = sources
		.map((source) => ({
			citations: citationsOf(source, entries, now),
			source,
		}))
		.sort((a, b) => a.source.name.localeCompare(b.source.name));

	return (
		<>
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderTitle>Sources</PageHeaderTitle>
					<PageHeaderActions>
						<NewSourceDialog />
					</PageHeaderActions>
				</PageHeaderHeading>
				<PageHeaderDescription>
					Who we credit, under which licence, and how often a copied page must
					be re-checked.
				</PageHeaderDescription>
			</PageHeader>

			<div className="flex flex-col gap-6">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Source</TableHead>
							<TableHead>Licence</TableHead>
							<TableHead>Permission</TableHead>
							<TableHead>Refresh</TableHead>
							<TableHead className="text-right">Entries</TableHead>
							<TableHead>
								<span className="sr-only">Freshness</span>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map(({ source, citations }) => (
							<TableRow className="relative" key={source.slug}>
								<TableCell className="max-w-xs">
									{/* The link's ::after covers the row, so the whole row opens the source. */}
									<Link
										className="block truncate font-semibold text-ink outline-none after:absolute after:inset-0 hover:underline focus-visible:after:outline-2 focus-visible:after:outline-focus focus-visible:after:-outline-offset-2"
										href={`/library/sources/${source.slug}`}
									>
										{source.name}
									</Link>
									<span className="type-small block truncate text-ink-muted">
										{hostOf(source.url) ?? source.slug}
									</span>
								</TableCell>
								<TableCell className="max-w-xs">
									<span className="type-small line-clamp-2 text-ink-muted">
										{source.licence || "Not set"}
									</span>
								</TableCell>
								<TableCell>
									<PermissionBadge permission={source.permission} />
								</TableCell>
								<TableCell className="text-ink-muted tabular-nums">
									{source.refreshDays ? `${source.refreshDays} days` : "Never"}
								</TableCell>
								<TableCell className="text-right tabular-nums">
									{new Set(citations.map((c) => c.entry.slug)).size}
								</TableCell>
								<TableCell>
									<StaleBadge citations={citations} />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
				<p aria-live="polite" className="type-small text-ink-muted">
					{sources.length} sources
				</p>
			</div>
		</>
	);
}
