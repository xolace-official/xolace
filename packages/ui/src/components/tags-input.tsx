"use client";

import {
	Clear as TagsInputClearPrimitive,
	Input as TagsInputInputPrimitive,
	ItemDelete as TagsInputItemDeletePrimitive,
	Item as TagsInputItemPrimitive,
	ItemText as TagsInputItemTextPrimitive,
	Label as TagsInputLabelPrimitive,
	Root as TagsInputRootPrimitive,
} from "@diceui/tags-input";
import { cn } from "@xolace/ui/lib/utils";
import { XIcon } from "lucide-react";
import type * as React from "react";

// diceui tags-input, restyled to the Xolace inputs: sunken well, 2px line, focus lip.

function TagsInput({
	className,
	...props
}: React.ComponentProps<typeof TagsInputRootPrimitive>) {
	return (
		<TagsInputRootPrimitive
			className={cn("flex w-full flex-col gap-2", className)}
			data-slot="tags-input"
			{...props}
		/>
	);
}

function TagsInputLabel({
	className,
	...props
}: React.ComponentProps<typeof TagsInputLabelPrimitive>) {
	return (
		<TagsInputLabelPrimitive
			className={cn(
				"type-body-strong text-ink peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
				className
			)}
			data-slot="tags-input-label"
			{...props}
		/>
	);
}

function TagsInputList({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex min-h-12 w-full flex-wrap items-center gap-1.5 rounded-md border-2 border-line bg-surface-sunken px-2 py-1.5 transition-[border-color,background-color,box-shadow] focus-within:border-focus focus-within:bg-surface focus-within:shadow-[0_var(--depth-sm)_0_var(--focus)] hover:border-line-strong has-aria-invalid:border-coral has-aria-invalid:bg-coral-soft",
				className
			)}
			data-slot="tags-input-list"
			{...props}
		/>
	);
}

function TagsInputInput({
	className,
	...props
}: React.ComponentProps<typeof TagsInputInputPrimitive>) {
	return (
		<TagsInputInputPrimitive
			className={cn(
				"type-body h-8 min-w-24 flex-1 bg-transparent px-1 text-ink outline-hidden placeholder:text-ink-muted disabled:cursor-not-allowed disabled:opacity-60",
				className
			)}
			data-slot="tags-input-input"
			{...props}
		/>
	);
}

function TagsInputItem({
	className,
	children,
	...props
}: React.ComponentProps<typeof TagsInputItemPrimitive>) {
	return (
		<TagsInputItemPrimitive
			className={cn(
				"type-small inline-flex h-7 max-w-[calc(100%-8px)] items-center gap-1 rounded-full border-2 border-lavender bg-lavender-soft pr-1 pl-2.5 font-semibold text-lavender-text outline-hidden data-disabled:cursor-not-allowed data-editable:select-none data-highlighted:border-focus data-editing:bg-surface data-disabled:opacity-60",
				className
			)}
			data-slot="tags-input-item"
			{...props}
		>
			<TagsInputItemTextPrimitive className="truncate">
				{children}
			</TagsInputItemTextPrimitive>
			<TagsInputItemDeletePrimitive className="grid size-5 shrink-0 place-items-center rounded-full opacity-70 transition-opacity hover:bg-lavender hover:text-on-lavender hover:opacity-100">
				<XIcon className="size-3.5 stroke-[2.5]" />
			</TagsInputItemDeletePrimitive>
		</TagsInputItemPrimitive>
	);
}

function TagsInputClear({
	...props
}: React.ComponentProps<typeof TagsInputClearPrimitive>) {
	return <TagsInputClearPrimitive data-slot="tags-input-clear" {...props} />;
}

export {
	TagsInput,
	TagsInputClear,
	TagsInputInput,
	TagsInputItem,
	TagsInputLabel,
	TagsInputList,
};
