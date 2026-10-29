import type { Metadata } from "next";

import { NewImportScreen } from "@/features/imports/new-import-screen";

export const metadata: Metadata = { title: "New import · Xolace Admin" };

export default function NewImportPage() {
	return <NewImportScreen />;
}
