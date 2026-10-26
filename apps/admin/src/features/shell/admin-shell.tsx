import { LayoutDashboardIcon, PaletteIcon } from "lucide-react";
import type { ReactNode } from "react";

import { type NavGroup, SideNav } from "./side-nav";

const NAV: NavGroup[] = [
	{
		items: [
			{
				href: "/",
				icon: <LayoutDashboardIcon />,
				id: "dashboard",
				label: "Dashboard",
			},
		],
	},
	{
		items: [
			{
				href: "/design",
				icon: <PaletteIcon />,
				id: "design",
				label: "Design system",
			},
		],
		title: "System",
	},
];

/** Side nav on the left, content up to 1280px wide on the right. */
export function AdminShell({
	current,
	children,
}: {
	current: string;
	children: ReactNode;
}) {
	return (
		<div className="flex min-h-dvh bg-bg">
			<SideNav current={current} groups={NAV} />
			<main className="mx-auto w-full max-w-7xl px-10 pt-16 pb-12">
				{children}
			</main>
		</div>
	);
}
