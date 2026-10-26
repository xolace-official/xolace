import type { ReactNode } from "react";

import Providers from "@/components/providers";
import { requireAdmin } from "@/features/auth/guards";
import { AdminShell } from "@/features/shell/admin-shell";

/** Every signed-in admin screen: Convex, the fixture stores and the sidebar shell. */
export default async function ConsoleLayout({
	children,
}: {
	children: ReactNode;
}) {
	await requireAdmin();

	return (
		<Providers>
			<AdminShell>{children}</AdminShell>
		</Providers>
	);
}
