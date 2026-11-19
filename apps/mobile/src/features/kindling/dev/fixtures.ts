/** The board's kindling (handoff `kindling.md` §2.5), as `paths.getActive` would send it. */
import type {
	ActiveKindling,
	ServerTwig,
	TrailView,
	TwigState,
} from "../kindling-model";
import { trailView } from "../kindling-model";

type Twig = Pick<ServerTwig, "kind" | "actionType" | "why"> &
	Partial<ServerTwig>;

const DAY_MS = 86_400_000;
const TWO_DAYS = 2;

const kindling = (id: string, twigs: Twig[]): ActiveKindling =>
	({
		_creationTime: 0,
		_id: id,
		generatedAt: Date.now() - TWO_DAYS * DAY_MS,
		sessionId: "fixture-session",
		twigs: twigs.map((t, order) => ({
			_id: `${id}-${order}`,
			order,
			params: {},
			state: "pending",
			...t,
		})),
	}) as unknown as ActiveKindling;

/** Breathing, a voice, a bridge and a try: the board's four. */
export const BOARD = kindling("fixture-board", [
	{
		actionType: "breathing_box",
		kind: "breathing",
		why: "Breathing helped you settle on Tuesday. Two minutes, the same as then.",
	},
	{
		actionType: "audio_topic_work",
		kind: "audio",
		why: "For when work won’t leave your head after the day is over.",
	},
	{
		actionType: "bridge_note",
		kind: "bridge",
		why: "Your sister came up. A short note might be enough to start.",
	},
	{
		actionType: "try_say_no",
		detail: "Pick one ask this week that costs you more than it gives.",
		kind: "try",
		title: "Say no to one small thing",
		why: "Yes has been costing you. Practise on something small this week.",
	},
]);

/** A xolacer twig second, for "Finding someone". */
export const WITH_XOLACER = kindling("fixture-xolacer", [
	{
		actionType: "breathing_box",
		kind: "breathing",
		why: "Breathing helped you settle on Tuesday. Two minutes, the same as then.",
	},
	{
		actionType: "xolacer_match",
		kind: "xolacer",
		why: "Someone who has carried something like this, ready to listen.",
	},
	{
		actionType: "read_article",
		kind: "read",
		why: "A short piece on letting a hard week be a hard week.",
	},
]);

/** The board's kindling with the server's states already set. */
export function viewOf(
	active: ActiveKindling,
	states?: readonly TwigState[]
): TrailView {
	const view = trailView(active);
	if (!view) {
		throw new Error("fixture kindling has no twigs");
	}
	return states ? { ...view, states: [...states] } : view;
}
