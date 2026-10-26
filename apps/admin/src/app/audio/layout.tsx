import type { ReactNode } from "react";

import { AudioFixtureProvider } from "@/features/audio/audio-provider";

// One Audio store for the list, editor and topics, so an edit shows everywhere.
export default function AudioLayout({ children }: { children: ReactNode }) {
	return <AudioFixtureProvider>{children}</AudioFixtureProvider>;
}
