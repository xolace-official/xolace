import { WriteData } from "@/features/letters/write/write-data";
import { WriteScreen } from "@/features/letters/write/write-screen";

export default function WriteLetterRoute() {
	return (
		<WriteData>
			<WriteScreen />
		</WriteData>
	);
}
