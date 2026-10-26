"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { Button } from "@xolace/ui/components/button";
import { Input } from "@xolace/ui/components/input";
import { Separator } from "@xolace/ui/components/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@xolace/ui/components/sheet";
import { Skeleton } from "@xolace/ui/components/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@xolace/ui/components/tooltip";
import { useIsMobile } from "@xolace/ui/hooks/use-mobile";
import { cn } from "@xolace/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { PanelLeftIcon } from "lucide-react";
import {
	type ComponentProps,
	type CSSProperties,
	createContext,
	use,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
// Fits a 48px menu button plus the group's 12px gutters when collapsed to icons.
const SIDEBAR_WIDTH_ICON = "4.5rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

interface SidebarContextProps {
	isMobile: boolean;
	open: boolean;
	openMobile: boolean;
	setOpen: (open: boolean) => void;
	setOpenMobile: (open: boolean) => void;
	state: "expanded" | "collapsed";
	toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextProps | null>(null);

function useSidebar() {
	const context = use(SidebarContext);
	if (!context) {
		throw new Error("useSidebar must be used within a SidebarProvider.");
	}

	return context;
}

function SidebarProvider({
	defaultOpen = true,
	open: openProp,
	onOpenChange: setOpenProp,
	className,
	style,
	children,
	...props
}: ComponentProps<"div"> & {
	defaultOpen?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	const isMobile = useIsMobile();
	const [openMobile, setOpenMobile] = useState(false);

	// Uncontrolled unless `open` / `onOpenChange` are passed.
	const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
	const open = openProp ?? uncontrolledOpen;
	// Manual memoization: these go into the context value below, and packages/ui is
	// not compiled by the React Compiler.
	const setOpen = useCallback(
		(value: boolean) => {
			if (setOpenProp) {
				setOpenProp(value);
			} else {
				setUncontrolledOpen(value);
			}
			// Read back by the layout on the server, so the first paint has the right width.
			// biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is async and missing in older Safari; this is a plain UI preference
			document.cookie = `${SIDEBAR_COOKIE_NAME}=${value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
		},
		[setOpenProp]
	);

	const toggleSidebar = useCallback(() => {
		if (isMobile) {
			setOpenMobile((current) => !current);
		} else {
			setOpen(!open);
		}
	}, [isMobile, open, setOpen]);

	// ⌘B / Ctrl+B toggles the sidebar.
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
				(event.metaKey || event.ctrlKey)
			) {
				event.preventDefault();
				toggleSidebar();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [toggleSidebar]);

	// We add a state so that we can do data-state="expanded" or "collapsed".
	// This makes it easier to style the sidebar with Tailwind classes.
	const state = open ? "expanded" : "collapsed";

	const contextValue = useMemo<SidebarContextProps>(
		() => ({
			isMobile,
			open,
			openMobile,
			setOpen,
			setOpenMobile,
			state,
			toggleSidebar,
		}),
		[state, open, setOpen, isMobile, openMobile, toggleSidebar]
	);

	return (
		<SidebarContext value={contextValue}>
			<div
				className={cn(
					"group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar",
					className
				)}
				data-slot="sidebar-wrapper"
				style={
					{
						"--sidebar-width": SIDEBAR_WIDTH,
						"--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
						...style,
					} as CSSProperties
				}
				{...props}
			>
				{children}
			</div>
		</SidebarContext>
	);
}

function Sidebar({
	side = "left",
	variant = "sidebar",
	collapsible = "offcanvas",
	className,
	children,
	dir,
	...props
}: ComponentProps<"div"> & {
	side?: "left" | "right";
	variant?: "sidebar" | "floating" | "inset";
	collapsible?: "offcanvas" | "icon" | "none";
}) {
	const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

	if (collapsible === "none") {
		return (
			<div
				className={cn(
					"flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground",
					className
				)}
				data-slot="sidebar"
				{...props}
			>
				{children}
			</div>
		);
	}

	if (isMobile) {
		return (
			<Sheet onOpenChange={setOpenMobile} open={openMobile} {...props}>
				<SheetContent
					className="w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground shadow-none [&>button]:hidden"
					data-mobile="true"
					data-sidebar="sidebar"
					data-slot="sidebar"
					dir={dir}
					side={side}
					style={
						{
							"--sidebar-width": SIDEBAR_WIDTH_MOBILE,
						} as CSSProperties
					}
				>
					<SheetHeader className="sr-only">
						<SheetTitle>Sidebar</SheetTitle>
						<SheetDescription>Displays the mobile sidebar.</SheetDescription>
					</SheetHeader>
					<div className="flex h-full w-full flex-col">{children}</div>
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<div
			className="group peer hidden text-sidebar-foreground md:block"
			data-collapsible={state === "collapsed" ? collapsible : ""}
			data-side={side}
			data-slot="sidebar"
			data-state={state}
			data-variant={variant}
		>
			{/* This is what handles the sidebar gap on desktop */}
			<div
				className={cn(
					"relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
					"group-data-[collapsible=offcanvas]:w-0",
					"group-data-[side=right]:rotate-180",
					variant === "floating" || variant === "inset"
						? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
						: "group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
				)}
				data-slot="sidebar-gap"
			/>
			<div
				className={cn(
					"fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear data-[side=right]:right-0 data-[side=left]:left-0 data-[side=right]:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)] data-[side=left]:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)] md:flex",
					// Adjust the padding for floating and inset variants.
					variant === "floating" || variant === "inset"
						? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
						: "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-sidebar-border group-data-[side=right]:border-sidebar-border group-data-[side=left]:border-r-2 group-data-[side=right]:border-l-2",
					className
				)}
				data-side={side}
				data-slot="sidebar-container"
				{...props}
			>
				<div
					className="group-data-[variant=floating]:lip group-data-[variant=floating]:depth-md flex size-full flex-col bg-sidebar group-data-[variant=floating]:rounded-xl group-data-[variant=floating]:border-2 group-data-[variant=floating]:border-sidebar-border"
					data-sidebar="sidebar"
					data-slot="sidebar-inner"
				>
					{children}
				</div>
			</div>
		</div>
	);
}

function SidebarTrigger({
	className,
	onClick,
	...props
}: ComponentProps<typeof Button>) {
	const { toggleSidebar } = useSidebar();
	const handleClick = useCallback<
		NonNullable<ComponentProps<typeof Button>["onClick"]>
	>(
		(event) => {
			onClick?.(event);
			toggleSidebar();
		},
		[onClick, toggleSidebar]
	);

	return (
		<Button
			className={cn(className)}
			data-sidebar="trigger"
			data-slot="sidebar-trigger"
			onClick={handleClick}
			size="icon-sm"
			variant="ghost"
			{...props}
		>
			<PanelLeftIcon />
			<span className="sr-only">Toggle sidebar</span>
		</Button>
	);
}

function SidebarRail({ className, ...props }: ComponentProps<"button">) {
	const { toggleSidebar } = useSidebar();

	return (
		<button
			aria-label="Toggle sidebar"
			className={cn(
				"absolute inset-y-0 z-20 hidden w-4 transition-all ease-linear after:absolute after:inset-y-0 after:start-1/2 after:w-[2px] hover:after:bg-line-strong group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex ltr:-translate-x-1/2 rtl:-translate-x-1/2",
				"in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
				"[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
				"group-data-[collapsible=offcanvas]:translate-x-0 hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:after:left-full",
				"[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
				"[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
				className
			)}
			data-sidebar="rail"
			data-slot="sidebar-rail"
			onClick={toggleSidebar}
			tabIndex={-1}
			title="Toggle sidebar"
			type="button"
			{...props}
		/>
	);
}

function SidebarInset({ className, ...props }: ComponentProps<"main">) {
	return (
		<main
			className={cn(
				"relative flex w-full min-w-0 flex-1 flex-col bg-bg md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2 md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:border-2 md:peer-data-[variant=inset]:border-line",
				className
			)}
			data-slot="sidebar-inset"
			{...props}
		/>
	);
}

function SidebarInput({ className, ...props }: ComponentProps<typeof Input>) {
	return (
		<Input
			className={cn("h-10 w-full", className)}
			data-sidebar="input"
			data-slot="sidebar-input"
			{...props}
		/>
	);
}

function SidebarHeader({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn("flex flex-col gap-2 px-3 pt-6 pb-2", className)}
			data-sidebar="header"
			data-slot="sidebar-header"
			{...props}
		/>
	);
}

function SidebarFooter({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex flex-col gap-2 border-sidebar-border border-t-2 px-3 py-4",
				className
			)}
			data-sidebar="footer"
			data-slot="sidebar-footer"
			{...props}
		/>
	);
}

function SidebarSeparator({
	className,
	...props
}: ComponentProps<typeof Separator>) {
	return (
		<Separator
			className={cn(
				"mx-3 w-auto bg-sidebar-border data-horizontal:h-0.5",
				className
			)}
			data-sidebar="separator"
			data-slot="sidebar-separator"
			{...props}
		/>
	);
}

function SidebarContent({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
				className
			)}
			data-sidebar="content"
			data-slot="sidebar-content"
			{...props}
		/>
	);
}

function SidebarGroup({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"relative flex w-full min-w-0 flex-col px-3 py-1",
				className
			)}
			data-sidebar="group"
			data-slot="sidebar-group"
			{...props}
		/>
	);
}

function SidebarGroupLabel({
	className,
	render,
	...props
}: useRender.ComponentProps<"div"> & ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		props: mergeProps<"div">(
			{
				className: cn(
					"type-eyebrow flex h-9 shrink-0 items-center rounded-sm px-3 text-ink-muted outline-hidden transition-[margin,opacity] duration-200 ease-linear group-data-[collapsible=icon]:-mt-9 group-data-[collapsible=icon]:opacity-0 [&>svg]:size-4 [&>svg]:shrink-0",
					className
				),
			},
			props
		),
		render,
		state: {
			sidebar: "group-label",
			slot: "sidebar-group-label",
		},
	});
}

function SidebarGroupAction({
	className,
	render,
	...props
}: useRender.ComponentProps<"button"> & ComponentProps<"button">) {
	return useRender({
		defaultTagName: "button",
		props: mergeProps<"button">(
			{
				className: cn(
					"absolute top-2 right-4 flex size-7 items-center justify-center rounded-sm p-0 text-ink-muted transition-transform after:absolute after:-inset-2 hover:bg-surface-sunken hover:text-ink group-data-[collapsible=icon]:hidden md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:stroke-[2.5]",
					className
				),
			},
			props
		),
		render,
		state: {
			sidebar: "group-action",
			slot: "sidebar-group-action",
		},
	});
}

function SidebarGroupContent({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn("w-full", className)}
			data-sidebar="group-content"
			data-slot="sidebar-group-content"
			{...props}
		/>
	);
}

function SidebarMenu({ className, ...props }: ComponentProps<"ul">) {
	return (
		<ul
			className={cn("flex w-full min-w-0 flex-col gap-1", className)}
			data-sidebar="menu"
			data-slot="sidebar-menu"
			{...props}
		/>
	);
}

function SidebarMenuItem({ className, ...props }: ComponentProps<"li">) {
	return (
		<li
			className={cn("group/menu-item relative", className)}
			data-sidebar="menu-item"
			data-slot="sidebar-menu-item"
			{...props}
		/>
	);
}

const sidebarMenuButtonVariants = cva(
	// The current page is outlined in lavender; everything else is muted ink.
	"peer/menu-button group/menu-button flex w-full items-center gap-3 overflow-hidden rounded-md border-2 border-transparent px-3 text-left font-display font-extrabold text-ink-muted uppercase tracking-[0.05em] no-underline outline-hidden transition-[width,height,padding,background-color,color] hover:bg-surface-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-10 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-active:border-sidebar-primary data-active:bg-sidebar-accent data-open:bg-surface-sunken data-active:text-sidebar-accent-foreground data-open:text-ink data-active:hover:bg-sidebar-accent data-active:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-12! group-data-[collapsible=icon]:px-[11px]! [&>span:last-child]:truncate [&_svg]:shrink-0 [&_svg]:stroke-[2.5]",
	{
		defaultVariants: {
			size: "default",
			variant: "default",
		},
		variants: {
			size: {
				default: "h-12 text-sm [&_svg]:size-[22px]",
				lg: "h-14 text-sm [&_svg]:size-6",
				sm: "h-9 text-[13px] [&_svg]:size-[18px]",
			},
			variant: {
				default: "",
				outline:
					"lip lip-line depth-sm border-line bg-surface text-ink hover:bg-surface-sunken",
			},
		},
	}
);

function SidebarMenuButton({
	render,
	isActive = false,
	variant = "default",
	size = "default",
	tooltip,
	className,
	...props
}: useRender.ComponentProps<"button"> &
	ComponentProps<"button"> & {
		isActive?: boolean;
		tooltip?: string | ComponentProps<typeof TooltipContent>;
	} & VariantProps<typeof sidebarMenuButtonVariants>) {
	const { isMobile, state } = useSidebar();
	const comp = useRender({
		defaultTagName: "button",
		props: mergeProps<"button">(
			{
				className: cn(sidebarMenuButtonVariants({ size, variant }), className),
			},
			props
		),
		render: tooltip ? <TooltipTrigger render={render} /> : render,
		state: {
			active: isActive,
			sidebar: "menu-button",
			size,
			slot: "sidebar-menu-button",
		},
	});

	if (!tooltip) {
		return comp;
	}

	const tooltipProps =
		typeof tooltip === "string" ? { children: tooltip } : tooltip;

	return (
		<Tooltip>
			{comp}
			<TooltipContent
				align="center"
				hidden={state !== "collapsed" || isMobile}
				side="right"
				{...tooltipProps}
			/>
		</Tooltip>
	);
}

function SidebarMenuAction({
	className,
	render,
	showOnHover = false,
	...props
}: useRender.ComponentProps<"button"> &
	ComponentProps<"button"> & {
		showOnHover?: boolean;
	}) {
	return useRender({
		defaultTagName: "button",
		props: mergeProps<"button">(
			{
				className: cn(
					"absolute right-2 flex size-8 items-center justify-center rounded-sm p-0 text-ink-muted transition-transform after:absolute after:-inset-2 hover:bg-surface-sunken hover:text-ink peer-hover/menu-button:text-ink group-data-[collapsible=icon]:hidden peer-data-[size=default]/menu-button:top-2 peer-data-[size=lg]/menu-button:top-3 peer-data-[size=sm]/menu-button:top-0.5 md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:stroke-[2.5]",
					showOnHover &&
						"group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 aria-expanded:opacity-100 peer-data-active/menu-button:text-sidebar-accent-foreground md:opacity-0",
					className
				),
			},
			props
		),
		render,
		state: {
			sidebar: "menu-action",
			slot: "sidebar-menu-action",
		},
	});
}

function SidebarMenuBadge({ className, ...props }: ComponentProps<"div">) {
	return (
		// A count that needs action (open reports): solid coral, like Badge solid.
		<div
			className={cn(
				"lip lip-coral-lip depth-sm pointer-events-none absolute right-3 flex h-6 min-w-6 select-none items-center justify-center rounded-sm bg-coral px-1.5 font-display font-extrabold text-on-coral text-xs tabular-nums group-data-[collapsible=icon]:hidden peer-data-[size=default]/menu-button:top-3 peer-data-[size=lg]/menu-button:top-4 peer-data-[size=sm]/menu-button:top-1.5",
				className
			)}
			data-sidebar="menu-badge"
			data-slot="sidebar-menu-badge"
			{...props}
		/>
	);
}

function SidebarMenuSkeleton({
	className,
	showIcon = false,
	...props
}: ComponentProps<"div"> & {
	showIcon?: boolean;
}) {
	// Random width between 50 and 90%.
	const [width] = useState(() => `${Math.floor(Math.random() * 40) + 50}%`);

	return (
		<div
			className={cn("flex h-12 items-center gap-3 rounded-md px-3", className)}
			data-sidebar="menu-skeleton"
			data-slot="sidebar-menu-skeleton"
			{...props}
		>
			{showIcon ? (
				<Skeleton
					className="size-[22px] rounded-sm"
					data-sidebar="menu-skeleton-icon"
				/>
			) : null}
			<Skeleton
				className="h-4 max-w-(--skeleton-width) flex-1"
				data-sidebar="menu-skeleton-text"
				style={
					{
						"--skeleton-width": width,
					} as CSSProperties
				}
			/>
		</div>
	);
}

function SidebarMenuSub({ className, ...props }: ComponentProps<"ul">) {
	return (
		<ul
			className={cn(
				"mx-5 flex min-w-0 translate-x-px flex-col gap-1 border-sidebar-border border-l-2 px-3 py-1 group-data-[collapsible=icon]:hidden",
				className
			)}
			data-sidebar="menu-sub"
			data-slot="sidebar-menu-sub"
			{...props}
		/>
	);
}

function SidebarMenuSubItem({ className, ...props }: ComponentProps<"li">) {
	return (
		<li
			className={cn("group/menu-sub-item relative", className)}
			data-sidebar="menu-sub-item"
			data-slot="sidebar-menu-sub-item"
			{...props}
		/>
	);
}

function SidebarMenuSubButton({
	render,
	size = "md",
	isActive = false,
	className,
	...props
}: useRender.ComponentProps<"a"> &
	ComponentProps<"a"> & {
		size?: "sm" | "md";
		isActive?: boolean;
	}) {
	return useRender({
		defaultTagName: "a",
		props: mergeProps<"a">(
			{
				className: cn(
					"type-body-strong flex min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-sm px-3 text-ink-muted no-underline outline-hidden hover:bg-surface-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[size=md]:h-9 data-[size=sm]:h-8 data-active:bg-sidebar-accent data-[size=sm]:text-[13px] data-active:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:stroke-[2.5]",

					className
				),
			},
			props
		),
		render,
		state: {
			active: isActive,
			sidebar: "menu-sub-button",
			size,
			slot: "sidebar-menu-sub-button",
		},
	});
}

export {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInput,
	SidebarInset,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
	useSidebar,
};
