import type { ReactNode } from "react";

import { ImportsFixtureProvider } from "@/features/imports/imports-provider";

// One store for the list, the new-import flow and each run, so a run started on
// /imports/new keeps processing while you move between them.
export default function ImportsLayout({ children }: { children: ReactNode }) {
	return <ImportsFixtureProvider>{children}</ImportsFixtureProvider>;
}
