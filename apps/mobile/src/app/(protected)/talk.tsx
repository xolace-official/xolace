// Dev-build only until the talk door ships (#594); the server gates Plus.
// Open with xolace://talk.
import { Redirect } from "expo-router";
import { TalkScreen } from "@/src/features/talk/talk-screen";

export default function TalkRoute() {
	if (!__DEV__) {
		return <Redirect href="/" />;
	}
	return <TalkScreen />;
}
