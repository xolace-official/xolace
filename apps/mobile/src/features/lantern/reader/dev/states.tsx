/** Lantern's reader and its sheets on fixtures: `xolace://dev/lantern/<id>`. */
import type { DevState } from "@/dev/dev-state";
import {
	CLASSIC,
	FixtureAppearance,
	FixtureReader,
	FixtureSources,
	FixtureTranscript,
	LISTENING,
	PREVIEW_ENDED,
	SIGNALS,
} from "@/features/lantern/reader/dev/fixture-reader";
import {
	FINE,
	MANY_SOURCES,
	WINTER,
} from "@/features/lantern/reader/dev/reads";
import {
	ReaderGone,
	ReaderSkeleton,
} from "@/features/lantern/reader/reader-skeleton";

/** The reader draws its own bar, as its route does. */
const NO_BAR = { headerShown: false };
/** The board's offsets on the classic read at 18 pt (handoff §13). */
const AT = { finished: -560, folded: 520, listening: 430 } as const;
const END = Number.POSITIVE_INFINITY;
const PARTWAY = { ...SIGNALS, position: 0.4 };
const FINISHED = { ...SIGNALS, finished: true, helpedCount: 212 };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "reader",
		options: NO_BAR,
		Screen: () => <FixtureReader />,
		title: "Reader, at the top",
	},
	{
		id: "reader-pick-up",
		options: NO_BAR,
		Screen: () => <FixtureReader opensAt="top" signals={PARTWAY} />,
		title: "Reader opening at the top: Pick up at 40%",
	},
	{
		id: "reader-resumed",
		options: NO_BAR,
		Screen: () => <FixtureReader signals={PARTWAY} />,
		title: "Reader opening at its place (production's resume)",
	},
	{
		id: "reader-folded",
		options: NO_BAR,
		Screen: () => <FixtureReader startAt={AT.folded} />,
		title: "Past the fold: the bar, the read line, minutes left",
	},
	{
		id: "reader-clear",
		options: NO_BAR,
		Screen: () => (
			<FixtureReader
				prefs={{ ...CLASSIC, mode: "clear" }}
				startAt={AT.folded}
			/>
		),
		title: "Clear",
	},
	{
		id: "reader-fire",
		options: NO_BAR,
		Screen: () => (
			<FixtureReader
				prefs={{ fire: true, mode: "fire", size: 18 }}
				startAt={AT.folded}
			/>
		),
		title: "By the fire, dimmed",
	},
	{
		id: "reader-listening",
		options: NO_BAR,
		Screen: () => <FixtureReader audio={LISTENING} startAt={AT.listening} />,
		title: "Listening: the dock",
	},
	{
		id: "reader-preview-ended",
		options: NO_BAR,
		Screen: () => (
			<FixtureReader audio={PREVIEW_ENDED} startAt={AT.listening} />
		),
		title: "Preview ended (free): Keep listening",
	},
	{
		id: "reader-end",
		options: NO_BAR,
		Screen: () => <FixtureReader signals={FINISHED} startAt={AT.finished} />,
		title: "The end of a read: Finished, the count, Up next",
	},
	{
		id: "reader-reflect",
		options: NO_BAR,
		Screen: () => <FixtureReader signals={FINISHED} startAt={END} />,
		title: "Reflect on this, the helpline, Back to top",
	},
	{
		id: "reader-story",
		options: NO_BAR,
		Screen: () => <FixtureReader entry={WINTER} />,
		title: "A story with a content note",
	},
	{
		id: "reader-verbatim",
		options: NO_BAR,
		Screen: () => <FixtureReader entry={FINE} startAt={END} />,
		title: "A story as its publisher wrote it",
	},
	{
		id: "reader-loading",
		options: NO_BAR,
		Screen: ReaderSkeleton,
		title: "Reader, loading",
	},
	{
		id: "reader-gone",
		options: NO_BAR,
		Screen: ReaderGone,
		title: "A read that's no longer in Lantern",
	},
	{
		id: "aa-sheet",
		options: NO_BAR,
		Screen: () => <FixtureAppearance />,
		title: "The Aa sheet",
	},
	{
		id: "aa-sheet-clear",
		options: NO_BAR,
		Screen: () => <FixtureAppearance initial={{ ...CLASSIC, mode: "clear" }} />,
		title: "The Aa sheet, Clear",
	},
	{
		id: "sources-sheet",
		options: NO_BAR,
		Screen: () => <FixtureSources />,
		title: "View sources",
	},
	{
		id: "sources-sheet-long",
		options: NO_BAR,
		// Past the sheet's cap: it scrolls to the last source and the licence.
		Screen: () => <FixtureSources sources={MANY_SOURCES} />,
		title: "View sources, more than fit",
	},
	{
		id: "transcript-sheet",
		options: NO_BAR,
		Screen: FixtureTranscript,
		title: "The transcript",
	},
];
