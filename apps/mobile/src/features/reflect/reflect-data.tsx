import { createContext, type ReactNode, use } from "react";
import type { NotQuiteReason, PathId } from "./copy";
import type {
	CareStep,
	MirrorLines,
	ReflectStage,
	ResourceRow,
	Seg,
	WaitError,
} from "./reflect-model";
import type { TextureSetId } from "./texture-sets";
import { useReflectData } from "./use-reflect";

/**
 * Everything Reflect reads and does, one session from the field to "Heard". Two adapters fill
 * it: production's session machine on Convex (`ReflectData`, `use-reflect.ts`) and the
 * prototype's simulated server in its dev states (`dev/fixture-reflect.tsx`).
 *
 * The session lives on the server, so closing Reflect at any stage keeps it; the next open picks
 * it up from `sessions.getActive`. The mirror's sub-states (Not quite, picking a line, the care
 * card, the tile chosen on Where next) are screen state the parts share, kept here so a dev
 * state can open on any of them.
 */
export type Reflect = {
	state: {
		stage: ReflectStage;
		/** The night window: the late copy, ember light and the ember face. */
		late: boolean;
		/** False while `sessions.getActive` loads: the chrome draws, the stage waits. */
		ready: boolean;

		// Write
		text: string;
		set: TextureSetId;
		picks: string[];
		/** The question: production's quote-reply seed or a month's prompt can take its place. */
		prompt: string;
		/** A pause in the writing (production's `typing-nudge`, 8 s). */
		nudge: boolean;
		/** Dictation is taking words. */
		listening: boolean;
		/** Bumped each time a finished take lands in the text (the drop, S2). */
		takeN: number;
		/** The free first-mic-tap upsell (#559) is up. */
		upsellOpen: boolean;

		// Sent: what "Let it out" sent, shown as YOUR WORDS through the wait and the mirror.
		/** Your words cut into runs, each paired with the mirror phrase it lent (−1: plain). */
		yourWords: readonly Seg[];
		sentPicks: string[];
		/** A talk's mirror says who it was with ("From your talk with …"). */
		companionName: string | null;

		// Wait
		/** The stage line (0–2), from the server's `processingStage`. */
		waitStage: number;
		slow: boolean;
		offline: boolean;
		/** The session failed: the words are kept and the card offers a way on. */
		error: WaitError | null;
		/** Bumped each time the words lift out of the writing box. */
		liftN: number;

		// Mirror
		/** The escalation path: no celebration, the care card instead of the actions. */
		heavy: boolean;
		/** The first mirror, and the one after a Not quite or Say more (the whole mirror). */
		mirror: { first: MirrorLines; revised: MirrorLines | null };
		/** Which version shows: 1 first, 2 revised. */
		mv: 1 | 2;
		/** Refinements so far; at two, "Leave it here" replaces Say more and Not quite. */
		turns: number;
		atCap: boolean;
		/** False hides only Say more: a talk with too little talk time left to reopen. */
		canSayMore: boolean;
		/** The mirror named a gap (claim strength reaching or holding): more words would help. */
		sayMoreHelps: boolean;
		/** A refinement is with the server: the mirror shimmers until the new one lands. */
		rewriting: boolean;
		/** A tapped mirror line flashes where you said it: the line, and a count per tap. */
		flash: { line: number; n: number };
		/** Bumped each time a mirror writes in (first or revised). */
		landN: number;
		nq: boolean;
		/** The line Not quite is about (−1: none picked). */
		sel: number;
		pickMode: boolean;
		sayMore: boolean;
		nqReason: NotQuiteReason | null;
		nqText: string;
		/** Read aloud: the server has audio for this mirror, and whether it is playing. */
		audio: { ready: boolean; playing: boolean };

		// Care (heavy)
		care: CareStep;
		resources: readonly ResourceRow[];

		// Where next
		nextPick: PathId | null;
		/** Production's space-name prompt, asked once on Where next. */
		spaceNameOpen: boolean;

		// Heard
		/** The streak, counted when the session completed; null until it reads. */
		streak: number | null;
	};
	actions: {
		/** The mirror's and Where next's screen state: what the parts change together. */
		patch: (p: Partial<ReflectUi>) => void;
		setText: (text: string) => void;
		setSet: (set: TextureSetId) => void;
		/** Toasts "Four is plenty" at the cap. */
		togglePick: (word: string) => void;
		/** Let it out. Returns false when there's nothing to send. */
		send: () => boolean;

		/** Hold to speak: the mic went down, came up (keep the words), or slid away (cancel). */
		startSpeaking: () => void;
		stopSpeaking: () => void;
		cancelSpeaking: () => void;
		/** The upsell's two answers. */
		upgradeDictation: () => void;
		dismissUpsell: () => void;

		/** ✕: the session keeps going; a draft or a mirror waits on Today. */
		close: () => void;
		/** "Step away": as ✕, with the toast that it keeps going. */
		stepAway: () => void;
		openHelp: () => void;
		/** The hourly cap's door: the paywall, as production's error state opened it. */
		seePlus: () => void;
		retry: () => void;
		startOver: () => void;

		/** A tap on a mirror line: flashes where you said it, or says it came from you. */
		tapLine: (line: number, borrowed: boolean) => void;
		thatsIt: () => void;
		/** Not quite: picks the line and opens the panel; with no line, asks which. */
		notQuite: (line?: number) => void;
		sayMore: () => void;
		pickReason: (reason: NotQuiteReason) => void;
		setNqText: (text: string) => void;
		submitNotQuite: () => void;
		closeNotQuite: () => void;
		/** After two tries: production's `gave_up`, then Where next. */
		leaveIt: () => void;
		setVersion: (mv: 1 | 2) => void;
		toggleAudio: () => void;

		/** The care card: show the list (engaged), seen them, not right now (dismissed). */
		showResources: () => void;
		resourcesSeen: () => void;
		notNow: () => void;
		openResource: (row: ResourceRow) => void;

		/** Where next: the tile was chosen; the trace runs, then `goPath` follows it. */
		choosePath: (path: PathId) => void;
		goPath: (path: PathId) => void;
		saveSpaceName: (name: string) => Promise<string | null>;
		dismissSpaceName: () => void;

		/** Heard's button: on to the session's end. */
		finish: () => void;
	};
};

/** The screen state `patch` sets. */
export type ReflectUi = Pick<
	Reflect["state"],
	"care" | "nextPick" | "nq" | "pickMode" | "sayMore" | "sel"
>;

const ReflectContext = createContext<Reflect | null>(null);

export function ReflectProvider({
	value,
	children,
}: {
	value: Reflect;
	children: ReactNode;
}) {
	return <ReflectContext value={value}>{children}</ReflectContext>;
}

export function useReflect(): Reflect {
	const reflect = use(ReflectContext);
	if (!reflect) {
		throw new Error("useReflect needs a ReflectProvider above it");
	}
	return reflect;
}

/** The app's adapter: Reflect on production's session machine. */
export function ReflectData({ children }: { children: ReactNode }) {
	const value = useReflectData();
	return <ReflectProvider value={value}>{children}</ReflectProvider>;
}
