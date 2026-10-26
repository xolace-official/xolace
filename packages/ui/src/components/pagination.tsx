import { Button } from "@xolace/ui/components/button";
import { cn } from "@xolace/ui/lib/utils";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	MoreHorizontalIcon,
} from "lucide-react";
import type * as React from "react";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
	return (
		<nav
			aria-label="pagination"
			className={cn("mx-auto flex w-full justify-center", className)}
			data-slot="pagination"
			{...props}
		/>
	);
}

function PaginationContent({
	className,
	...props
}: React.ComponentProps<"ul">) {
	return (
		<ul
			className={cn("flex items-center gap-1.5", className)}
			data-slot="pagination-content"
			{...props}
		/>
	);
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
	return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
	isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
	React.ComponentProps<"a">;

function PaginationLink({
	className,
	isActive,
	size = "icon-sm",
	...props
}: PaginationLinkProps) {
	return (
		<Button
			className={cn(
				isActive &&
					"lip-lavender border-lavender bg-lavender-soft text-lavender-text hover:bg-lavender-soft",
				className
			)}
			nativeButton={false}
			render={
				<a
					aria-current={isActive ? "page" : undefined}
					data-active={isActive}
					data-slot="pagination-link"
					{...props}
				/>
			}
			size={size}
			variant={isActive ? "outline" : "ghost"}
		/>
	);
}

function PaginationPrevious({
	className,
	text = "Previous",
	...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
	return (
		<PaginationLink
			aria-label="Go to previous page"
			className={cn("pl-2.5!", className)}
			size="sm"
			{...props}
		>
			<ChevronLeftIcon data-icon="inline-start" />
			<span className="hidden sm:block">{text}</span>
		</PaginationLink>
	);
}

function PaginationNext({
	className,
	text = "Next",
	...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
	return (
		<PaginationLink
			aria-label="Go to next page"
			className={cn("pr-2.5!", className)}
			size="sm"
			{...props}
		>
			<span className="hidden sm:block">{text}</span>
			<ChevronRightIcon data-icon="inline-end" />
		</PaginationLink>
	);
}

function PaginationEllipsis({
	className,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span
			aria-hidden
			className={cn(
				"flex size-9 items-center justify-center text-ink-muted [&_svg:not([class*='size-'])]:size-4",

				className
			)}
			data-slot="pagination-ellipsis"
			{...props}
		>
			<MoreHorizontalIcon />
			<span className="sr-only">More pages</span>
		</span>
	);
}

export {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
};
