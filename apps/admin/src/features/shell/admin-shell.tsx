import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@xolace/ui/components/sidebar";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { AccountMenu } from "@/features/auth/account-menu";

import { AppSidebar } from "./app-sidebar";
import { EnvironmentBadge } from "./environment-badge";

// Written by SidebarProvider when the sidebar is toggled.
const SIDEBAR_COOKIE = "sidebar_state";

/** Sidebar on the left; a top bar with the toggle and environment; content up to 1280px wide. */
export async function AdminShell({ children }: { children: ReactNode }) {
	const defaultOpen = (await cookies()).get(SIDEBAR_COOKIE)?.value !== "false";

	return (
		<SidebarProvider defaultOpen={defaultOpen}>
			<AppSidebar />
			<SidebarInset>
				<header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-line border-b-2 bg-bg px-4 md:px-6">
					<SidebarTrigger />

					<div className="ml-auto flex items-center gap-3">
						<EnvironmentBadge />
						<AccountMenu />
					</div>
				</header>
				<main className="mx-auto w-full max-w-7xl px-4 pt-10 pb-12 md:px-10">
					{children}
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
