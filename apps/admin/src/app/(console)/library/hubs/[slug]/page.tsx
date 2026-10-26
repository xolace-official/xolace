import type { Metadata } from "next";

import { HubEditorScreen } from "@/features/library/hubs/hub-editor";

export const metadata: Metadata = { title: "Edit hub · Xolace Admin" };

export default async function HubPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	return <HubEditorScreen slug={slug} />;
}
