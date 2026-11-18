// The first look as intake's step: filled from the store, with the Talk demo over it.
import { FirstLookData } from "./first-look-data";
import { FirstLookScreen } from "./first-look-screen";
import type { FirstLookStepProps } from "./use-first-look";

export function FirstLookStep(props: FirstLookStepProps) {
	return (
		<FirstLookData {...props}>
			<FirstLookScreen />
		</FirstLookData>
	);
}
