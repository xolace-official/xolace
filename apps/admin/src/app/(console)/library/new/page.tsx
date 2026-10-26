import type { Metadata } from "next";

import { NewEntryScreen } from "@/features/library/new-entry-screen";

export const metadata: Metadata = { title: "New entry · Xolace Admin" };

export default function NewEntryPage() {
	return <NewEntryScreen />;
}
