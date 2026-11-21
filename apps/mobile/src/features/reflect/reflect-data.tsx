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

export type Reflect = {
	state: {
		stage: ReflectStage;
		late: boolean;
		ready: boolean;

		text: string;
		set: TextureSetId;
		picks: string[];
		prompt: string;
		nudge: boolean;
		listening: boolean;
		sheetOpen: boolean;
		take: {
			writing: boolean;
			remainingMs: number | null;
			note: string | null;
			scribe: boolean;
		};
		takeN: number;
		upsellOpen: boolean;

		yourWords: readonly Seg[];
		sentPicks: string[];
		companionName: string | null;

		waitStage: number;
		slow: boolean;
		offline: boolean;
		error: WaitError | null;
		liftN: number;

		heavy: boolean;
		mirror: { first: MirrorLines; revised: MirrorLines | null };
		mv: 1 | 2;
		turns: number;
		atCap: boolean;
		canSayMore: boolean;
		sayMoreHelps: boolean;
		rewriting: boolean;
		flash: { line: number; n: number };
		landN: number;
		nq: boolean;
		sel: number;
		pickMode: boolean;
		sayMore: boolean;
		nqReason: NotQuiteReason | null;
		nqText: string;
		audio: { ready: boolean; playing: boolean };

		care: CareStep;
		resources: readonly ResourceRow[];

		nextPick: PathId | null;
		spaceNameOpen: boolean;
		whatHappened: boolean;

		streak: number | null;
	};
	actions: {
		patch: (p: Partial<ReflectUi>) => void;
		setText: (text: string) => void;
		setSet: (set: TextureSetId) => void;
		togglePick: (word: string) => void;
		send: () => boolean;

		startSpeaking: () => void;
		stopSpeaking: () => void;
		cancelSpeaking: () => void;
		upgradeDictation: () => void;
		dismissUpsell: () => void;

		close: () => void;
		stepAway: () => void;
		openHelp: () => void;
		seePlus: () => void;
		retry: () => void;
		startOver: () => void;

		tapLine: (line: number, borrowed: boolean) => void;
		thatsIt: () => void;
		notQuite: (line?: number) => void;
		sayMore: () => void;
		pickReason: (reason: NotQuiteReason) => void;
		setNqText: (text: string) => void;
		submitNotQuite: () => void;
		closeNotQuite: () => void;
		leaveIt: () => void;
		answerWhatHappened: (option: string) => void;
		setVersion: (mv: 1 | 2) => void;
		toggleAudio: () => void;

		showResources: () => void;
		resourcesSeen: () => void;
		notNow: () => void;
		openResource: (row: ResourceRow) => void;

		choosePath: (path: PathId) => void;
		goPath: (path: PathId) => void;
		saveSpaceName: (name: string) => Promise<string | null>;
		dismissSpaceName: () => void;

		finish: () => void;
	};
};

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

export function ReflectData({ children }: { children: ReactNode }) {
	const value = useReflectData();
	return <ReflectProvider value={value}>{children}</ReflectProvider>;
}
