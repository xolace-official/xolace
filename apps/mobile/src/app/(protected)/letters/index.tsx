import { LettersHubData } from "@/features/letters/hub/hub-data";
import {
	LettersLoading,
	LettersScreen,
} from "@/features/letters/hub/letters-screen";

export default function LettersRoute() {
	return (
		<LettersHubData loading={<LettersLoading />}>
			<LettersScreen />
		</LettersHubData>
	);
}
