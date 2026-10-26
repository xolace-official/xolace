import type { Metadata } from "next";

import { HubsScreen } from "@/features/library/hubs/hubs-screen";

export const metadata: Metadata = { title: "Hubs · Xolace Admin" };

export default function LibraryHubsPage() {
	return <HubsScreen />;
}
