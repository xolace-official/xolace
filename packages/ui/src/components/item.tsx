import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { Separator } from "@xolace/ui/components/separator";
import { cn } from "@xolace/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

// shadcn item (base-lyra), restyled: rows are 2px-lined tiles; a linked row lifts on
// hover like our cards.

// A list: render each `Item` as `render={<li />}`.
function ItemGroup({ className, ...props }: ComponentProps<"ul">) {
	return (
		<ul
			className={cn(
				"group/item-group flex w-full flex-col gap-3 has-data-[size=sm]:gap-2",
				className
			)}
			data-slot="item-group"
			{...props}
		/>
	);
}

function ItemSeparator({
	className,
	...props
}: ComponentProps<typeof Separator>) {
	return (
		<Separator
			className={cn("my-2", className)}
			data-slot="item-separator"
			orientation="horizontal"
			{...props}
		/>
	);
}

const itemVariants = cva(
	"group/item flex w-full flex-wrap items-center rounded-md border-2 outline-none transition-[background-color,border-color] duration-100 focus-visible:border-focus [a]:hover:border-line-strong [a]:hover:bg-surface-sunken",
	{
		defaultVariants: {
			size: "default",
			variant: "default",
		},
		variants: {
			size: {
				default: "gap-4 px-4 py-3",
				sm: "gap-3 px-3 py-2.5",
			},
			variant: {
				default: "border-transparent",
				muted: "border-transparent bg-surface-sunken",
				outline: "border-line bg-surface",
			},
		},
	}
);

function Item({
	className,
	variant = "default",
	size = "default",
	render,
	...props
}: useRender.ComponentProps<"div"> & VariantProps<typeof itemVariants>) {
	return useRender({
		defaultTagName: "div",
		props: mergeProps<"div">(
			{
				className: cn(itemVariants({ className, size, variant })),
			},
			props
		),
		render,
		state: {
			size,
			slot: "item",
			variant,
		},
	});
}

const itemMediaVariants = cva(
	"flex shrink-0 items-center justify-center gap-2 group-has-data-[slot=item-description]/item:self-start [&_svg]:pointer-events-none",
	{
		defaultVariants: {
			variant: "default",
		},
		variants: {
			variant: {
				default: "bg-transparent",
				icon: "size-10 rounded-md bg-surface-sunken text-ink-muted group-data-[size=sm]/item:size-8 [&_svg:not([class*='size-'])]:size-5 [&_svg]:stroke-[2.5]",
				image:
					"size-10 overflow-hidden rounded-md group-data-[size=sm]/item:size-8 [&_img]:size-full [&_img]:object-cover",
			},
		},
	}
);

function ItemMedia({
	className,
	variant = "default",
	...props
}: ComponentProps<"div"> & VariantProps<typeof itemMediaVariants>) {
	return (
		<div
			className={cn(itemMediaVariants({ className, variant }))}
			data-slot="item-media"
			data-variant={variant}
			{...props}
		/>
	);
}

function ItemContent({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex min-w-0 flex-1 flex-col gap-0.5 [&+[data-slot=item-content]]:flex-none",
				className
			)}
			data-slot="item-content"
			{...props}
		/>
	);
}

function ItemTitle({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"type-body-strong line-clamp-1 flex w-fit items-center gap-2 text-ink",
				className
			)}
			data-slot="item-title"
			{...props}
		/>
	);
}

function ItemDescription({ className, ...props }: ComponentProps<"p">) {
	return (
		<p
			className={cn(
				"type-small line-clamp-2 text-left text-ink-muted [&>a:hover]:text-ink [&>a]:underline [&>a]:underline-offset-4",
				className
			)}
			data-slot="item-description"
			{...props}
		/>
	);
}

function ItemActions({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn("flex items-center gap-2", className)}
			data-slot="item-actions"
			{...props}
		/>
	);
}

function ItemHeader({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex basis-full items-center justify-between gap-2",
				className
			)}
			data-slot="item-header"
			{...props}
		/>
	);
}

function ItemFooter({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex basis-full items-center justify-between gap-2",
				className
			)}
			data-slot="item-footer"
			{...props}
		/>
	);
}

export {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemFooter,
	ItemGroup,
	ItemHeader,
	ItemMedia,
	ItemSeparator,
	ItemTitle,
};
