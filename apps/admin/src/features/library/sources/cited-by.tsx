"use client";

import { Badge } from "@xolace/ui/components/badge";
import { ClockAlertIcon } from "lucide-react";
import Link from "next/link";

import { daysSinceRetrieved } from "../citations";
import { useSourceEditor } from "./source-editor-provider";

function retrievedLabel(days: number | null) {
	if (days === null) {
		return "Retrieval date unknown";
	}
	if (days === 0) {
		return "Retrieved today";
	}
	return `Retrieved ${days} day${days === 1 ? "" : "s"} ago`;
}

/** Every entry that credits this source, page by page, with how old each copy is. */
export function CitedBy() {
	const {
		state: { citations, source },
		meta: { now },
	} = useSourceEditor();

	if (citations.length === 0) {
		return (
			<p className="type-small text-ink-muted">
				No entry credits this source yet.
			</p>
		);
	}

	const entries = [...new Set(citations.map((c) => c.entry))];

	return (
		<ol className="flex flex-col gap-4">
			{entries.map((entry) => (
				<li className="flex flex-col gap-1.5" key={entry.slug}>
					<Link
						className="type-body-strong text-ink hover:underline"
						href={`/library/${entry.slug}`}
					>
						{entry.title}
					</Link>
					<ul className="flex flex-col gap-1.5">
						{citations
							.filter((c) => c.entry === entry)
							.map(({ credit, stale }) => {
								const days = daysSinceRetrieved(credit, entry, now);
								return (
									<li
										className="flex flex-col gap-1 rounded-md border-2 border-line bg-surface-sunken px-3 py-2"
										key={credit.pageUrl ?? credit.pageTitle}
									>
										<span className="type-small line-clamp-2 text-ink">
											{credit.pageTitle}
										</span>
										<span className="type-small flex flex-wrap items-center gap-2 text-ink-muted">
											{retrievedLabel(days)}
											{stale ? (
												<Badge variant="ember">
													<ClockAlertIcon />
													Past {source.refreshDays} days
												</Badge>
											) : null}
										</span>
									</li>
								);
							})}
					</ul>
				</li>
			))}
		</ol>
	);
}
