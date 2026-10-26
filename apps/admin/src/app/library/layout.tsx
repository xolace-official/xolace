import type { ReactNode } from "react";

import { LibraryFixtureProvider } from "@/features/library/library-provider";

// One Library store for the list and the editor, so an edit shows in the list.
export default function LibraryLayout({ children }: { children: ReactNode }) {
	return <LibraryFixtureProvider>{children}</LibraryFixtureProvider>;
}
