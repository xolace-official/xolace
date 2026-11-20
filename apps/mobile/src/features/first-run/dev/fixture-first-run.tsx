import { useScheme } from "@/design/scheme";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { type FirstRun, FirstRunProvider } from "../first-run-data";
import { FirstRunScreen } from "../first-run-screen";
import type { SignInOutcome } from "../use-sign-in";

const noop = () => undefined;

type Props = {
	start?: FirstRun["state"]["start"];
	day?: boolean;
	reduced?: boolean;
	scene?: FirstRun["state"]["scene"];
	outcome?: SignInOutcome;
	after?: number;
};

export function FixtureFirstRun({
	start = "promise",
	day,
	reduced,
	scene,
	outcome,
	after = 1200,
}: Props) {
	const osReduced = useEffectiveReducedMotion();
	const light = useScheme() === "light";
	const value: FirstRun = {
		actions: {
			acceptPromise: noop,
			seated: noop,
			signIn: () =>
				new Promise((resolve) => {
					if (outcome) {
						setTimeout(() => resolve(outcome), after);
					}
				}),
		},
		state: {
			day: day ?? light,
			reduced: reduced ?? osReduced,
			scene,
			sessionHeld: true,
			start,
		},
	};
	return (
		<FirstRunProvider value={value}>
			<FirstRunScreen />
		</FirstRunProvider>
	);
}
