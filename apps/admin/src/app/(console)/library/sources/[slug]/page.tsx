import type { Metadata } from "next";

import { SourceEditorScreen } from "@/features/library/sources/source-editor";

export const metadata: Metadata = { title: "Edit source · Xolace Admin" };

export default async function SourcePage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	return <SourceEditorScreen slug={slug} />;
}
