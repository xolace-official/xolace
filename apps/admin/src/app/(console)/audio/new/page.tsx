import type { Metadata } from "next";

import { NewTrackScreen } from "@/features/audio/new-track-screen";

export const metadata: Metadata = { title: "New track · Xolace Admin" };

export default function NewTrackPage() {
	return <NewTrackScreen />;
}
