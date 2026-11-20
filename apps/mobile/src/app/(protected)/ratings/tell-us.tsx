import { TellUsSheet } from "@/features/ratings/tell-us/tell-us-sheet";
import { TellUsData } from "@/features/ratings/tell-us-data";

/** Tell us: a form sheet over the rating screen. */
export default function TellUsRoute() {
	return (
		<TellUsData>
			<TellUsSheet />
		</TellUsData>
	);
}
