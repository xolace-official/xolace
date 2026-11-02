import type { Metadata } from "next";

import { EventEditorScreen } from "@/features/events/event-editor";

export const metadata: Metadata = { title: "New event · Xolace Admin" };

export default function NewEventPage() {
	return <EventEditorScreen />;
}
