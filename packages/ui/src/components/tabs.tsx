"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "@xolace/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

function Tabs({
	className,
	orientation = "horizontal",
	...props
}: TabsPrimitive.Root.Props) {
	return (
		<TabsPrimitive.Root
			className={cn(
				"group/tabs flex gap-4 data-horizontal:flex-col",
				className
			)}
			data-orientation={orientation}
			data-slot="tabs"
			{...props}
		/>
	);
}

const tabsListVariants = cva(
	"group/tabs-list inline-flex w-fit items-center gap-2 text-ink-muted group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
	{
		defaultVariants: {
			variant: "default",
		},
		variants: {
			variant: {
				default: "flex-wrap",
				line: "gap-1 border-line border-b-2",
			},
		},
	}
);

function TabsList({
	className,
	variant = "default",
	...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
	return (
		<TabsPrimitive.List
			className={cn(tabsListVariants({ variant }), className)}
			data-slot="tabs-list"
			data-variant={variant}
			{...props}
		/>
	);
}

// Chunky tab: the selected one is a lavender pill with a 2px lip.
function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
	return (
		<TabsPrimitive.Tab
			className={cn(
				"relative inline-flex h-11 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border-2 border-transparent px-4 font-display font-extrabold text-sm uppercase tracking-[0.04em] outline-none transition-colors hover:bg-surface-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start [&_svg:not([class*='size-'])]:size-[18px] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[2.5]",
				"data-active:lip data-active:lip-lavender-lip data-active:depth-sm data-active:border-lavender data-active:bg-lavender-soft data-active:text-lavender-text",
				"group-data-[variant=line]/tabs-list:rounded-b-none group-data-[variant=line]/tabs-list:data-active:border-x-transparent group-data-[variant=line]/tabs-list:data-active:border-t-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent group-data-[variant=line]/tabs-list:data-active:shadow-none",
				className
			)}
			data-slot="tabs-trigger"
			{...props}
		/>
	);
}

// Count pill inside a TabsTrigger.
function TabsCount({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			className={cn(
				"inline-grid h-5.5 min-w-5.5 place-items-center rounded-full bg-surface-sunken in-data-active:bg-lavender px-1.5 font-sans in-data-active:text-on-lavender text-ink-muted text-xs tracking-normal",
				className
			)}
			data-slot="tabs-count"
			{...props}
		/>
	);
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
	return (
		<TabsPrimitive.Panel
			className={cn("type-body flex-1 outline-none", className)}
			data-slot="tabs-content"
			{...props}
		/>
	);
}

export {
	Tabs,
	TabsContent,
	TabsCount,
	TabsList,
	TabsTrigger,
	tabsListVariants,
};
