import type { Metadata } from "next";

import { ImportsScreen } from "@/features/imports/imports-screen";

export const metadata: Metadata = { title: "Imports · Xolace Admin" };

export default function ImportsPage() {
	return <ImportsScreen />;
}
