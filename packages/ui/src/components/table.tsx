"use client";

import { cn } from "@xolace/ui/lib/utils";
import type * as React from "react";

function Table({ className, ...props }: React.ComponentProps<"table">) {
	return (
		<div
			className="lip depth-md relative w-full overflow-x-auto rounded-lg border-2 border-line bg-surface"
			data-slot="table-container"
		>
			<table
				className={cn(
					"type-data w-full caption-bottom border-collapse",
					className
				)}
				data-slot="table"
				{...props}
			/>
		</div>
	);
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
	return (
		<thead
			className={cn(
				"bg-surface-sunken [&_tr]:border-line [&_tr]:border-b-2 [&_tr]:hover:bg-transparent",
				className
			)}
			data-slot="table-header"
			{...props}
		/>
	);
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
	return (
		<tbody
			className={cn("[&_tr:last-child]:border-0", className)}
			data-slot="table-body"
			{...props}
		/>
	);
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
	return (
		<tfoot
			className={cn(
				"border-line border-t-2 bg-surface-sunken font-semibold [&>tr]:last:border-b-0",
				className
			)}
			data-slot="table-footer"
			{...props}
		/>
	);
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
	return (
		<tr
			className={cn(
				"border-line border-b-2 transition-colors hover:bg-surface-sunken has-aria-expanded:bg-surface-sunken data-[state=selected]:bg-lavender-soft",
				className
			)}
			data-slot="table-row"
			{...props}
		/>
	);
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
	return (
		<th
			className={cn(
				"type-eyebrow h-11 whitespace-nowrap px-4 text-left align-middle text-ink-muted [&:has([role=checkbox])]:pr-0",
				className
			)}
			data-slot="table-head"
			{...props}
		/>
	);
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
	return (
		<td
			className={cn(
				"whitespace-nowrap px-4 py-3 align-middle text-ink [&:has([role=checkbox])]:pr-0",
				className
			)}
			data-slot="table-cell"
			{...props}
		/>
	);
}

function TableCaption({
	className,
	...props
}: React.ComponentProps<"caption">) {
	return (
		<caption
			className={cn("type-small mt-4 text-ink-muted", className)}
			data-slot="table-caption"
			{...props}
		/>
	);
}

export {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
};
