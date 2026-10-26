"use client";

import { Label } from "@xolace/ui/components/label";
import { Separator } from "@xolace/ui/components/separator";
import { cn } from "@xolace/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
	return (
		<fieldset
			className={cn(
				"flex flex-col gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
				className
			)}
			data-slot="field-set"
			{...props}
		/>
	);
}

function FieldLegend({
	className,
	variant = "legend",
	...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
	return (
		<legend
			className={cn(
				"data-[variant=label]:type-body-strong data-[variant=legend]:type-h3 mb-3 text-ink",
				className
			)}
			data-slot="field-legend"
			data-variant={variant}
			{...props}
		/>
	);
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"group/field-group @container/field-group flex w-full flex-col gap-5 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4",
				className
			)}
			data-slot="field-group"
			{...props}
		/>
	);
}

const fieldVariants = cva(
	"group/field flex w-full gap-2 data-[invalid=true]:text-coral-text",
	{
		defaultVariants: {
			orientation: "vertical",
		},
		variants: {
			orientation: {
				horizontal:
					"flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
				responsive:
					"@md/field-group:flex-row flex-col @md/field-group:items-center *:w-full @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
				vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
			},
		},
	}
);

function Field({
	className,
	orientation = "vertical",
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: a single field is a styled div; FieldSet is the real fieldset
		<div
			className={cn(fieldVariants({ orientation }), className)}
			data-orientation={orientation}
			data-slot="field"
			role="group"
			{...props}
		/>
	);
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"group/field-content flex flex-1 flex-col gap-0.5 leading-snug",
				className
			)}
			data-slot="field-content"
			{...props}
		/>
	);
}

function FieldLabel({
	className,
	...props
}: React.ComponentProps<typeof Label>) {
	return (
		<Label
			className={cn(
				"group/field-label peer/field-label flex w-fit gap-2 leading-snug has-[>[data-slot=field]]:has-[:focus-visible]:border-focus has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border-2 has-[>[data-slot=field]]:border-line has-data-checked:border-lavender has-data-checked:bg-lavender-soft has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-surface-sunken *:data-[slot=field]:p-3 group-data-[disabled=true]/field:opacity-50",
				"has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col",
				className
			)}
			data-slot="field-label"
			{...props}
		/>
	);
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"type-body-strong flex w-fit items-center gap-2 text-ink group-data-[disabled=true]/field:opacity-50",
				className
			)}
			data-slot="field-label"
			{...props}
		/>
	);
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			className={cn(
				"type-small text-left text-ink-muted group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-1.5",
				"nth-last-2:-mt-1 last:mt-0",
				"[&>a:hover]:text-ink [&>a]:underline [&>a]:underline-offset-4",
				className
			)}
			data-slot="field-description"
			{...props}
		/>
	);
}

function FieldSeparator({
	children,
	className,
	...props
}: React.ComponentProps<"div"> & {
	children?: React.ReactNode;
}) {
	return (
		<div
			className={cn(
				"type-caption relative -my-2 h-5 group-data-[variant=outline]/field-group:-mb-2",
				className
			)}
			data-content={!!children}
			data-slot="field-separator"
			{...props}
		>
			<Separator className="absolute inset-0 top-1/2" />
			{children ? (
				<span
					className="relative mx-auto block w-fit bg-surface px-2 text-ink-muted"
					data-slot="field-separator-content"
				>
					{children}
				</span>
			) : null}
		</div>
	);
}

function fieldErrorContent(
	children: React.ReactNode,
	errors: Array<{ message?: string } | undefined> | undefined
): React.ReactNode {
	if (children) {
		return children;
	}
	const messages = [
		...new Set(
			(errors ?? []).flatMap((error) => (error?.message ? [error.message] : []))
		),
	];
	if (messages.length === 0) {
		return null;
	}
	if (messages.length === 1) {
		return messages[0];
	}
	return (
		<ul className="ml-4 flex list-disc flex-col gap-1">
			{messages.map((message) => (
				<li key={message}>{message}</li>
			))}
		</ul>
	);
}

function FieldError({
	className,
	children,
	errors,
	...props
}: React.ComponentProps<"div"> & {
	errors?: Array<{ message?: string } | undefined>;
}) {
	const content = fieldErrorContent(children, errors);

	if (!content) {
		return null;
	}

	return (
		<div
			className={cn("type-small font-semibold text-coral-text", className)}
			data-slot="field-error"
			role="alert"
			{...props}
		>
			{content}
		</div>
	);
}

export {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSeparator,
	FieldSet,
	FieldTitle,
};
