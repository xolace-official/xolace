import type { Metadata } from "next";

import { TopicsScreen } from "@/features/audio/topics-screen";

export const metadata: Metadata = { title: "Topics · Xolace Admin" };

export default function AudioTopicsPage() {
	return <TopicsScreen />;
}
