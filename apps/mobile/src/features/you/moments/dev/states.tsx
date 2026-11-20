import type { DevState } from "@/dev/dev-state";
import {
	BARE_SESSION,
	EDGE_ROWS,
	MO_NOW,
	MOMENT_ROWS,
	MOMENT_SESSION,
	TALK_LINES,
	TALK_SESSION,
} from "@/features/you/moments/dev/moments-fixtures";
import {
	MomentProvider,
	type MomentScreenData,
} from "@/features/you/moments/moment/moment-data";
import { MomentScreen } from "@/features/you/moments/moment/moment-screen";
import {
	MomentsProvider,
	type MomentsScreenData,
} from "@/features/you/moments/moments-data";
import {
	itemsOf,
	type MomentRow,
	type MomentSession,
	momentOf,
} from "@/features/you/moments/moments-model";
import { MomentsScreen } from "@/features/you/moments/moments-screen";

const noop = () => undefined;
const FREE_WINDOW = 30;

function FixtureMoments({
	rows,
	windowDays = null,
	loading = false,
}: {
	rows?: readonly MomentRow[];
	windowDays?: number | null;
	loading?: boolean;
}) {
	const value: MomentsScreenData = {
		actions: { doorSeen: noop, loadMore: noop, seeAll: noop },
		state: loading
			? undefined
			: {
					canLoadMore: false,
					items: itemsOf(rows ?? MOMENT_ROWS, MO_NOW),
					loadingMore: false,
					windowDays,
				},
	};
	return (
		<MomentsProvider value={value}>
			<MomentsScreen />
		</MomentsProvider>
	);
}

function FixtureMoment({
	session = MOMENT_SESSION,
	audio = { playing: false, ready: true },
	talk = false,
	missing,
}: {
	session?: MomentSession;
	audio?: { ready: boolean; playing: boolean };
	talk?: boolean;
	missing?: "loading" | "gone";
}) {
	const moment = momentOf(session, MO_NOW);
	const value: MomentScreenData = {
		actions: { again: noop, share: noop, toggleAudio: noop },
		state: missing
			? { gone: null, loading: undefined }[missing]
			: {
					audio,
					companion: moment.companionName ?? "Xolace",
					moment,
					thread: talk ? [...TALK_LINES] : [],
				},
	};
	return (
		<MomentProvider value={value}>
			<MomentScreen />
		</MomentProvider>
	);
}

const LIST = { headerShown: true, title: "" };
const OWN_TOP = { headerShown: false };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "moments",
		options: LIST,
		Screen: () => <FixtureMoments />,
		title: "Moments (Xolace+): today, yesterday, this week, earlier",
	},
	{
		id: "moments-free",
		options: LIST,
		Screen: () => <FixtureMoments windowDays={FREE_WINDOW} />,
		title: "Moments, free, older ones hidden: the window's door",
	},
	{
		id: "moments-edges",
		options: LIST,
		Screen: () => <FixtureMoments rows={EDGE_ROWS} />,
		title:
			"Moments at the edges: no feeling or path, adaptive tone, a long mirror",
	},
	{
		id: "moments-empty",
		options: LIST,
		Screen: () => <FixtureMoments rows={[]} />,
		title: "Moments, none yet",
	},
	{
		id: "moments-loading",
		options: LIST,
		Screen: () => <FixtureMoments loading />,
		title: "Moments, the first page loading",
	},
	{
		id: "moment",
		options: OWN_TOP,
		Screen: () => <FixtureMoment />,
		title: "A moment: you said, the mirror, its voice",
	},
	{
		id: "moment-playing",
		options: OWN_TOP,
		Screen: () => <FixtureMoment audio={{ playing: true, ready: true }} />,
		title: "A moment, the mirror playing",
	},
	{
		id: "moment-talk",
		options: OWN_TOP,
		Screen: () => (
			<FixtureMoment
				audio={{ playing: false, ready: false }}
				session={TALK_SESSION}
				talk
			/>
		),
		title: "A talk's moment: the mirror, then the thread",
	},
	{
		id: "moment-bare",
		options: OWN_TOP,
		Screen: () => (
			<FixtureMoment
				audio={{ playing: false, ready: false }}
				session={BARE_SESSION}
			/>
		),
		title:
			"A moment with no mirror, words or feeling (what the server can send)",
	},
	{
		id: "moment-loading",
		options: OWN_TOP,
		Screen: () => <FixtureMoment missing="loading" />,
		title: "A moment loading",
	},
	{
		id: "moment-gone",
		options: OWN_TOP,
		Screen: () => <FixtureMoment missing="gone" />,
		title: "A moment that isn't there (deleted, or another person's)",
	},
];
