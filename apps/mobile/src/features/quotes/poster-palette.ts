// The parts of the poster palette a `--poster-*` token cannot express. Fixed on
// purpose: the poster is a printed object (fixed-palette convention, CLAUDE.md).

/** Yellow -> pink -> grey down the poster. */
export const POSTER_GRADIENT = {
	end: { x: 0.9, y: 1 },
	locations: [0, 0.22, 0.46, 0.62, 0.82, 1] as [number, number, ...number[]],
	start: { x: 0.1, y: 0 },
	stops: ["#F9F06B", "#FBE3A0", "#FBD7DE", "#F7AFC4", "#CFC9C6", "#B9B7B4"] as [
		string,
		string,
		...string[],
	],
};

/** Without grain the pink -> grey transition visibly bands on device (#294). */
export const POSTER_GRAIN_OPACITY = 0.09;

/** Archive card tints in the order the stack cycles them (#296). */
export const ARCHIVE_TINT_VARS = [
	"--color-archive-tint-1",
	"--color-archive-tint-2",
	"--color-archive-tint-3",
	"--color-archive-tint-4",
] as const;
