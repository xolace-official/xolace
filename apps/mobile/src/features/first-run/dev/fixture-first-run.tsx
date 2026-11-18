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
	/** What a tap on a sign-in button comes back with, after `after` ms; none keeps it waiting. */
	outcome?: SignInOutcome;
	after?: number;
};

/** First run on fixtures: nothing reaches Clerk, PostHog or the store. */
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
			start,
		},
	};
	return (
		<FirstRunProvider value={value}>
			<FirstRunScreen />
		</FirstRunProvider>
	);
}
