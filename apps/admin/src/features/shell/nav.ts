import {
	AudioLinesIcon,
	BookOpenTextIcon,
	FileUpIcon,
	LandmarkIcon,
	LayoutDashboardIcon,
	LibraryBigIcon,
	type LucideIcon,
	PaletteIcon,
	ScanSearchIcon,
	ShapesIcon,
} from "lucide-react";
import type { Route } from "next";

export interface NavItem {
	/** A count that needs action (failed imports). Solid coral. */
	badge?: number;
	href: Route;
	icon: LucideIcon;
	label: string;
}

export interface NavGroup {
	items: NavItem[];
	title?: string;
}

/** Admin v1 navigation (docs/plan/admin-v1.md). */
export const NAV: NavGroup[] = [
	{
		items: [{ href: "/", icon: LayoutDashboardIcon, label: "Overview" }],
	},
	{
		items: [
			{ href: "/library", icon: BookOpenTextIcon, label: "Entries" },
			{ href: "/library/hubs", icon: LibraryBigIcon, label: "Hubs" },
			{ href: "/library/sources", icon: LandmarkIcon, label: "Sources" },
		],
		title: "Library",
	},
	{
		items: [
			{ href: "/audio", icon: AudioLinesIcon, label: "Tracks" },
			{ href: "/audio/topics", icon: ShapesIcon, label: "Topics" },
		],
		title: "Audio",
	},
	{
		items: [{ href: "/imports", icon: FileUpIcon, label: "Imports" }],
		title: "Ingest",
	},
	{
		items: [
			{ href: "/search-index", icon: ScanSearchIcon, label: "Search index" },
			{ href: "/design", icon: PaletteIcon, label: "Design system" },
		],
		title: "System",
	},
];

/**
 * The nav item for a path: the longest href that is the path or a parent of it,
 * so `/library/hubs/x` lights up Hubs, not Entries.
 */
export function activeHref(pathname: string): Route | undefined {
	let best: Route | undefined;
	for (const group of NAV) {
		for (const { href } of group.items) {
			const matches =
				href === "/"
					? pathname === "/"
					: pathname === href || pathname.startsWith(`${href}/`);
			if (matches && (best === undefined || href.length > best.length)) {
				best = href;
			}
		}
	}
	return best;
}
