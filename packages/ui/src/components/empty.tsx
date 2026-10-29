import { cn } from "@xolace/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

function Empty({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-3 text-balance rounded-xl border-dashed p-6 text-center md:px-6 md:py-12",
				className
			)}
			data-slot="empty"
			{...props}
		/>
	);
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("flex max-w-sm flex-col items-center gap-2", className)}
			data-slot="empty-header"
			{...props}
		/>
	);
}

const emptyMediaVariants = cva(
	"mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		defaultVariants: {
			variant: "default",
		},
		variants: {
			variant: {
				default: "bg-transparent",
				icon: "flex size-12 shrink-0 items-center justify-center rounded-md bg-lavender-soft text-lavender-text [&_svg:not([class*='size-'])]:size-5",
			},
		},
	}
);

function EmptyMedia({
	className,
	variant = "default",
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
	return (
		<div
			className={cn(emptyMediaVariants({ className, variant }))}
			data-slot="empty-icon"
			data-variant={variant}
			{...props}
		/>
	);
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("type-h2 text-ink", className)}
			data-slot="empty-title"
			{...props}
		/>
	);
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<div
			className={cn(
				"type-body-lg text-ink-muted [&>a:hover]:text-lavender-text [&>a]:underline [&>a]:underline-offset-4",
				className
			)}
			data-slot="empty-description"
			{...props}
		/>
	);
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"type-body flex w-full min-w-0 max-w-sm flex-col items-center gap-4 text-balance",
				className
			)}
			data-slot="empty-content"
			{...props}
		/>
	);
}

export {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
};
