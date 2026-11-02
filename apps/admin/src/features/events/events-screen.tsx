"use client";

import { api } from "@xolace/backend/api";
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
import { useConvexAuth, useQuery } from "convex/react";
import { ImageOffIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EmptyState } from "@/features/flux/empty-state";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderDescription,
	PageHeaderHeading,
	PageHeaderTitle,
} from "@/features/shell/page-header";

import { type EventStatus, eventStatus, formatDay, localToday } from "./types";

const STATUS: Record<
	EventStatus,
	{ label: string; tone: "mint" | "neutral" | "sky" }
> = {
	ended: { label: "Ended", tone: "neutral" },
	live: { label: "Live", tone: "mint" },
	scheduled: { label: "Scheduled", tone: "sky" },
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
	const { label, tone } = STATUS[status];
	return <Badge variant={tone}>{label}</Badge>;
}

/** `/events`: the awareness events the app's home sheet shows in their dates. */
export function EventsScreen() {
	const { isAuthenticated } = useConvexAuth();
	const events = useQuery(
		api.admin.monthlyEvents.list,
		isAuthenticated ? {} : "skip"
	);
	// Taken once per mount, so statuses don't shift on a clock.
	const [today] = useState(localToday);

	return (
		<>
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderTitle>Events</PageHeaderTitle>
					<PageHeaderActions>
						<Link className={buttonVariants()} href="/events/new">
							<PlusIcon />
							New event
						</Link>
					</PageHeaderActions>
				</PageHeaderHeading>
				<PageHeaderDescription>
					Awareness months and days. Between its start and end dates an event
					opens as a sheet in the app, once per person; when two overlap, the
					lower priority number wins.
				</PageHeaderDescription>
			</PageHeader>

			{events?.length === 0 ? (
				<div className="lip depth-md rounded-xl border-2 border-line bg-surface">
					<EmptyState
						action={
							<Link className={buttonVariants()} href="/events/new">
								<PlusIcon />
								New event
							</Link>
						}
						description="Add the first awareness event."
						pose="map"
						title="No events yet"
					/>
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Event</TableHead>
							<TableHead>Dates</TableHead>
							<TableHead>Priority</TableHead>
							<TableHead>Status</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{(events ?? []).map((event) => (
							<TableRow className="relative" key={event.slug}>
								<TableCell className="max-w-lg">
									{/* The link's ::after covers the row, so the whole row opens the event. */}
									<Link
										className="block truncate font-semibold text-ink outline-none after:absolute after:inset-0 hover:underline focus-visible:after:outline-2 focus-visible:after:outline-focus focus-visible:after:-outline-offset-2"
										href={`/events/${event.slug}`}
									>
										{event.title}
									</Link>
									<span className="type-small block truncate text-ink-muted">
										{event.body}
									</span>
								</TableCell>
								<TableCell className="whitespace-nowrap text-ink-muted tabular-nums">
									{formatDay(event.startDate)} – {formatDay(event.endDate)}
								</TableCell>
								<TableCell className="tabular-nums">{event.priority}</TableCell>
								<TableCell>
									<span className="flex items-center gap-2">
										<EventStatusBadge status={eventStatus(event, today)} />
										{event.imageUrl ? null : (
											<ImageOffIcon
												aria-label="No image"
												className="size-4 text-ink-muted"
											/>
										)}
									</span>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</>
	);
}
