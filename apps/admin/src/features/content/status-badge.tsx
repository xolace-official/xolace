import { Badge } from "@xolace/ui/components/badge";
import { Spinner } from "@xolace/ui/components/spinner";
import { cn } from "@xolace/ui/lib/utils";
import {
	ArchiveIcon,
	CircleCheckIcon,
	ClockIcon,
	OctagonAlertIcon,
	PencilLineIcon,
	ShieldAlertIcon,
} from "lucide-react";
import type { ReactNode } from "react";

/** One status vocabulary for every content item and import row (docs/plan/admin-v1.md, "Item status"). */
export type ContentStatus =
	| "draft"
	| "needs_review"
	| "queued"
	| "processing"
	| "live"
	| "failed"
	| "retired";

const STATUS: Record<
	ContentStatus,
	{
		icon: ReactNode;
		label: string;
		tone: "neutral" | "ember" | "sky" | "mint" | "coral";
	}
> = {
	draft: { icon: <PencilLineIcon />, label: "Draft", tone: "neutral" },
	failed: { icon: <OctagonAlertIcon />, label: "Failed", tone: "coral" },
	live: { icon: <CircleCheckIcon />, label: "Live", tone: "mint" },
	needs_review: {
		icon: <ShieldAlertIcon />,
		label: "Needs review",
		tone: "ember",
	},
	processing: {
		icon: <Spinner className="size-3.5!" />,
		label: "Processing",
		tone: "sky",
	},
	queued: { icon: <ClockIcon />, label: "Queued", tone: "sky" },
	retired: { icon: <ArchiveIcon />, label: "Retired", tone: "neutral" },
};

/** Always a word plus an icon, never colour alone. */
export function StatusBadge({
	status,
	className,
}: {
	status: ContentStatus;
	className?: string;
}) {
	const { icon, label, tone } = STATUS[status];
	return (
		<Badge
			className={cn(status === "retired" && "line-through", className)}
			data-status={status}
			variant={tone}
		>
			{icon}
			{label}
		</Badge>
	);
}
