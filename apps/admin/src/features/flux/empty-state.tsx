import { cn } from "@xolace/ui/lib/utils";
import type { ReactNode } from "react";

import { type FluxPose, Mascot } from "./mascot";

/** Every empty list, cleared queue, no-results search and 404. Copy stays plain: no jokes in an error. */
export function EmptyState({
	pose,
	title,
	description,
	action,
	className,
}: {
	pose: FluxPose;
	/** Four words or fewer. */
	title: string;
	description?: ReactNode;
	action?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-col items-center gap-3 px-6 py-12 text-center",
				className
			)}
		>
			<Mascot pose={pose} />
			<h2 className="type-h2 mt-2 text-ink">{title}</h2>
			{description ? (
				<p className="type-body-lg max-w-105 text-ink-muted">{description}</p>
			) : null}
			{action ? (
				<div className="mt-3 flex flex-wrap justify-center gap-3">{action}</div>
			) : null}
		</div>
	);
}
