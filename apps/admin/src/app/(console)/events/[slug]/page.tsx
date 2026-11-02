import type { Metadata } from "next";

import { EventEditorScreen } from "@/features/events/event-editor";

export const metadata: Metadata = { title: "Edit event · Xolace Admin" };

export default async function EventPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	return <EventEditorScreen slug={slug} />;
}
