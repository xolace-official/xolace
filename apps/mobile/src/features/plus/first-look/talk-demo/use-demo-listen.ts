import { useListenTake } from "@/lib/speech/use-listen-take";

const DEMO_TAKE_SECONDS = 30;

type Handlers = {
	onDone: (transcript: string) => void;
	onUnavailable: () => void;
};

/** One spoken take in the talk demo, capped shorter than a real talk. */
export function useDemoListen({ onDone, onUnavailable }: Handlers) {
	return useListenTake({
		maxSeconds: DEMO_TAKE_SECONDS,
		onDone,
		onUnavailable,
	});
}
