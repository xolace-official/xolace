import { Badge } from "@xolace/ui/components/badge";
import { cn } from "@xolace/ui/lib/utils";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import type { ReactNode } from "react";

type StatTone = "lavender" | "sky" | "mint" | "ember" | "coral" | "pink";

const CHIP_CLASSES: Record<StatTone, string> = {
	coral: "bg-coral text-on-coral lip-coral-lip",
	ember: "bg-ember text-on-ember lip-ember-lip",
	lavender: "bg-lavender text-on-lavender lip-lavender-lip",
	mint: "bg-mint text-on-mint lip-mint-lip",
	pink: "bg-pink text-on-pink lip-pink-lip",
	sky: "bg-sky text-on-sky lip-sky-lip",
};

/**
 * KPI tile. Keep one tone per metric family across pages: users lavender,
 * sessions sky, resolved mint, pending ember, reports coral.
 */
export function StatCard({
	label,
	value,
	icon,
	tone = "lavender",
	delta,
	trend = "flat",
	invertTrend = false,
	caption,
	className,
}: {
	label: string;
	/** Pre-formatted ("12,480", "4m 12s"). */
	value: ReactNode;
	icon?: ReactNode;
	tone?: StatTone;
	delta?: string;
	trend?: "up" | "down" | "flat";
	/** For metrics where up is bad (reports, failures): up shows coral. */
	invertTrend?: boolean;
	caption?: string;
	className?: string;
}) {
	const good = invertTrend ? trend === "down" : trend === "up";
	let deltaTone: "mint" | "coral" | "neutral" = good ? "mint" : "coral";
	if (trend === "flat") {
		deltaTone = "neutral";
	}
	return (
		<div
			className={cn(
				"lip depth-md flex flex-col gap-2 rounded-lg border-2 border-line bg-surface px-6 py-5",
				className
			)}
		>
			<div className="flex items-center justify-between gap-3">
				<span className="type-eyebrow text-ink-muted">{label}</span>
				{icon ? (
					<span
						className={cn(
							"lip depth-sm grid size-10 shrink-0 place-items-center rounded-md [&_svg]:size-5 [&_svg]:stroke-[2.5]",
							CHIP_CLASSES[tone]
						)}
					>
						{icon}
					</span>
				) : null}
			</div>
			<div className="type-stat text-ink">{value}</div>
			{delta ? (
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant={deltaTone}>
						{trend === "up" ? <TrendingUpIcon /> : null}
						{trend === "down" ? <TrendingDownIcon /> : null}
						{delta}
					</Badge>
					{caption ? (
						<span className="type-small text-ink-muted">{caption}</span>
					) : null}
				</div>
			) : null}
		</div>
	);
}
