import type { Family } from "@/features/achievements/achievements-model";

/** Printed on the family's dusk, the same in every theme (see `--color-badge-card-*`). */
export const FAMILY: Record<Family, { ground: string; ink: string }> = {
	aurora: { ground: "bg-badge-aurora-dusk", ink: "text-badge-aurora-glow" },
	dawn: { ground: "bg-badge-dawn-dusk", ink: "text-badge-dawn-glow" },
	green: { ground: "bg-badge-green-dusk", ink: "text-badge-green-glow" },
	night: { ground: "bg-badge-night-dusk", ink: "text-badge-night-glow" },
	teal: { ground: "bg-badge-teal-dusk", ink: "text-badge-teal-glow" },
};

/**
 * Measures at scale 1, in points on the 360 × 360 card. The medallion hangs off the top-right
 * corner; the words stack up from the foot on the left, so a long title grows upwards into the
 * open space under the wordmark rather than into the footer.
 */
export const M = {
	art: { right: -42, size: 222, top: -40 },
	foot: { gap: 10, lh: 13, size: 9.5 },
	gap: 9,
	line: { lh: 26.5, size: 24.5 },
	mark: { h: 15, left: 24, top: 24 },
	name: { lh: 14, size: 10.5 },
	pad: 24,
	padBottom: 22,
} as const;
