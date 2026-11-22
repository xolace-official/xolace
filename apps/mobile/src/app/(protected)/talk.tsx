import { TalkData } from "@/features/talk/talk-data";
import { TalkScreen } from "@/features/talk/talk-screen";

export default function TalkRoute() {
	return (
		<TalkData>
			<TalkScreen />
		</TalkData>
	);
}
