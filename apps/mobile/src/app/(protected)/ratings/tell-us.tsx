import { TellUsSheet } from "@/features/ratings/tell-us/tell-us-sheet";
import { TellUsData } from "@/features/ratings/tell-us-data";

export default function TellUsRoute() {
	return (
		<TellUsData>
			<TellUsSheet />
		</TellUsData>
	);
}
