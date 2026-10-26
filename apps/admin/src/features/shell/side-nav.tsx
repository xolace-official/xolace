import { Badge } from "@xolace/ui/components/badge";
import { cn } from "@xolace/ui/lib/utils";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export interface NavItem {
	/** A count that needs action (open reports). Solid coral. */
	badge?: number | string;
	href: Route;
	icon: ReactNode;
	id: string;
	label: string;
}

export interface NavGroup {
	items: NavItem[];
	title?: string;
}

const LOCKUP_WIDTH = 107;
const LOCKUP_HEIGHT = 40;

/** The admin's left rail: lockup with an ADMIN tag, grouped items, current page outlined in lavender. */
export function SideNav({
	groups,
	current,
	footer,
	className,
}: {
	groups: NavGroup[];
	/** id of the current item. */
	current: string;
	footer?: ReactNode;
	className?: string;
}) {
	return (
		<nav
			aria-label="Admin"
			className={cn(
				"flex min-h-full w-64 shrink-0 flex-col gap-4 border-line border-r-2 bg-surface px-4 py-6",
				className
			)}
		>
			<div className="flex items-center gap-2 px-3 pb-2">
				<Image
					alt="Xolace"
					className="h-9 w-auto"
					height={LOCKUP_HEIGHT}
					priority
					src="/brand/xolace-lockup.png"
					width={LOCKUP_WIDTH}
				/>
				<span className="type-eyebrow rounded-sm bg-lavender-soft px-2 py-0.5 text-lavender-text">
					Admin
				</span>
			</div>
			{groups.map((group, index) => (
				<div className="grid gap-1" key={group.title ?? index}>
					{group.title ? (
						<div className="type-eyebrow px-3 py-2 text-ink-muted">
							{group.title}
						</div>
					) : null}
					{group.items.map((item) => {
						const active = item.id === current;
						return (
							<Link
								aria-current={active ? "page" : undefined}
								className={cn(
									"flex h-12 items-center gap-3 rounded-md border-2 border-transparent px-3 font-display font-extrabold text-ink-muted text-sm uppercase tracking-[0.05em] no-underline hover:bg-surface-sunken hover:text-ink [&_svg]:size-[22px] [&_svg]:stroke-[2.5]",
									active &&
										"border-lavender bg-lavender-soft text-lavender-text hover:bg-lavender-soft hover:text-lavender-text"
								)}
								href={item.href}
								key={item.id}
							>
								{item.icon}
								<span className="flex-1">{item.label}</span>
								{item.badge === undefined ? null : (
									<Badge solid variant="coral">
										{item.badge}
									</Badge>
								)}
							</Link>
						);
					})}
				</div>
			))}
			{footer ? (
				<div className="mt-auto border-line border-t-2 pt-4">{footer}</div>
			) : null}
		</nav>
	);
}
