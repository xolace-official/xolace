// Dev-build only (#591). Open with xolace://talk-live; the server gates Plus.
import { Redirect } from "expo-router";
import { LiveTalkScreen } from "@/src/features/talk/live/live-talk-screen";

export default function TalkLiveRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <LiveTalkScreen />;
}
