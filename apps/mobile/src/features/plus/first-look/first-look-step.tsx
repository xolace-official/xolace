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
