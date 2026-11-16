// Talk (S12): one screen from the start to the talk. The talk door opens it; the server
// gates Plus. "Say more" on a talk's mirror reopens it (`?reopen=<session>`). Also xolace://talk.
import { TalkData } from "@/features/talk/talk-data";
import { TalkScreen } from "@/features/talk/talk-screen";

export default function TalkRoute() {
	return (
		<TalkData>
			<TalkScreen />
		</TalkData>
	);
}
