import type { Metadata } from "next";

import { EventsScreen } from "@/features/events/events-screen";

export const metadata: Metadata = { title: "Events · Xolace Admin" };

export default function EventsPage() {
	return <EventsScreen />;
}
