import type { ReactNode } from "react";

import Providers from "@/components/providers";
import { requireAdmin } from "@/features/auth/guards";
import { StoresReady } from "@/features/content/stores-ready";
import { AdminShell } from "@/features/shell/admin-shell";

/** Every signed-in admin screen: Convex, the content stores and the sidebar shell. */
export default async function ConsoleLayout({
	children,
}: {
	children: ReactNode;
}) {
	await requireAdmin();

	return (
		<Providers>
			<AdminShell>
				<StoresReady>{children}</StoresReady>
			</AdminShell>
		</Providers>
	);
}
