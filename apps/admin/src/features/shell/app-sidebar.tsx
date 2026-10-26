"use client";

import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	useSidebar,
} from "@xolace/ui/components/sidebar";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { activeHref, NAV } from "./nav";

const LOCKUP_WIDTH = 107;
const LOCKUP_HEIGHT = 40;
const MARK_SIZE = 36;

/** The admin's left rail: lockup with an ADMIN tag, grouped items, current page outlined in lavender. Collapses to icons (⌘B). */
export function AppSidebar() {
	const current = activeHref(usePathname());
	// On mobile the sidebar is a sheet; picking a page should close it.
	const { setOpenMobile } = useSidebar();

	return (
		<Sidebar aria-label="Admin" collapsible="icon">
			<SidebarHeader>
				<Link
					aria-label="Xolace admin home"
					className="flex h-12 items-center gap-2 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
					href="/"
				>
					<Image
						alt=""
						className="h-9 w-auto group-data-[collapsible=icon]:hidden"
						height={LOCKUP_HEIGHT}
						priority
						src="/brand/xolace-lockup.png"
						width={LOCKUP_WIDTH}
					/>
					<Image
						alt=""
						className="hidden size-9 group-data-[collapsible=icon]:block"
						height={MARK_SIZE}
						src="/brand/flux-mark.png"
						width={MARK_SIZE}
					/>
					<span className="type-eyebrow rounded-sm bg-lavender-soft px-2 py-0.5 text-lavender-text group-data-[collapsible=icon]:hidden">
						Admin
					</span>
				</Link>
			</SidebarHeader>
			<SidebarContent>
				{NAV.map((group, index) => (
					<SidebarGroup key={group.title ?? index}>
						{group.title ? (
							<SidebarGroupLabel>{group.title}</SidebarGroupLabel>
						) : null}
						<SidebarGroupContent>
							<SidebarMenu>
								{group.items.map((item) => {
									const active = item.href === current;
									return (
										<SidebarMenuItem key={item.href}>
											<SidebarMenuButton
												isActive={active}
												render={
													<Link
														aria-current={active ? "page" : undefined}
														href={item.href}
														onClick={() => setOpenMobile(false)}
													/>
												}
												tooltip={item.label}
											>
												<item.icon />
												<span>{item.label}</span>
											</SidebarMenuButton>
											{item.badge === undefined ? null : (
												<SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
											)}
										</SidebarMenuItem>
									);
								})}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				))}
			</SidebarContent>
			<SidebarRail />
		</Sidebar>
	);
}
