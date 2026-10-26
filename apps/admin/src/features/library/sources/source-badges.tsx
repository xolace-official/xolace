import { Badge } from "@xolace/ui/components/badge";
import {
	CircleCheckIcon,
	ClockAlertIcon,
	HourglassIcon,
	MinusIcon,
} from "lucide-react";

import type { Citation } from "../citations";
import { PERMISSION_LABEL, type SourcePermission } from "../types";

const PERMISSION_TONE: Record<SourcePermission, "neutral" | "mint" | "ember"> =
	{
		granted: "mint",
		not_required: "neutral",
		pending: "ember",
	};

const PERMISSION_ICON: Record<SourcePermission, typeof MinusIcon> = {
	granted: CircleCheckIcon,
	not_required: MinusIcon,
	pending: HourglassIcon,
};

/** Whether we needed, and have, the publisher's permission to reuse it. */
export function PermissionBadge({
	permission,
}: {
	permission: SourcePermission;
}) {
	const Icon = PERMISSION_ICON[permission];
	return (
		<Badge variant={PERMISSION_TONE[permission]}>
			<Icon />
			{PERMISSION_LABEL[permission]}
		</Badge>
	);
}

/** "3 stale" when credits are past the refresh window; nothing otherwise. */
export function StaleBadge({ citations }: { citations: readonly Citation[] }) {
	const stale = citations.filter((citation) => citation.stale).length;
	if (stale === 0) {
		return null;
	}
	return (
		<Badge variant="ember">
			<ClockAlertIcon />
			{stale} stale
		</Badge>
	);
}
