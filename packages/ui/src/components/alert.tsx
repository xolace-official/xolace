import { cn } from "@xolace/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

// Inline message on a tinted ground with a full 2px tone stroke. Put an icon
// first; it sits in a filled chip. Title states the fact, body what to do.
const alertVariants = cva(
	"group/alert type-body relative grid w-full gap-0.5 rounded-lg border-2 p-4 text-left text-ink shadow-[0_var(--depth-sm)_0_var(--alert-fill)] has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-3 has-data-[slot=alert-action]:pr-32 *:[svg]:row-span-2 *:[svg]:box-content *:[svg]:size-[18px] *:[svg]:rounded-sm *:[svg]:bg-(--alert-fill) *:[svg]:stroke-3 *:[svg]:p-[7px] *:[svg]:text-(--alert-on)",
	{
		defaultVariants: {
			variant: "sky",
		},
		variants: {
			variant: {
				coral:
					"border-coral bg-coral-soft [--alert-fill:var(--coral)] [--alert-on:var(--on-coral)] [--alert-text:var(--coral-text)]",
				ember:
					"border-ember bg-ember-soft [--alert-fill:var(--ember)] [--alert-on:var(--on-ember)] [--alert-text:var(--ember-text)]",
				lavender:
					"border-lavender bg-lavender-soft [--alert-fill:var(--lavender)] [--alert-on:var(--on-lavender)] [--alert-text:var(--lavender-text)]",
				mint: "border-mint bg-mint-soft [--alert-fill:var(--mint)] [--alert-on:var(--on-mint)] [--alert-text:var(--mint-text)]",
				pink: "border-pink bg-pink-soft [--alert-fill:var(--pink)] [--alert-on:var(--on-pink)] [--alert-text:var(--pink-text)]",
				sky: "border-sky bg-sky-soft [--alert-fill:var(--sky)] [--alert-on:var(--on-sky)] [--alert-text:var(--sky-text)]",
			},
		},
	}
);

function Alert({
	className,
	variant,
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
	return (
		<div
			className={cn(alertVariants({ variant }), className)}
			data-slot="alert"
			role={variant === "coral" || variant === "ember" ? "alert" : "status"}
			{...props}
		/>
	);
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"type-body-strong pt-1 text-(--alert-text) group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3",
				className
			)}
			data-slot="alert-title"
			{...props}
		/>
	);
}

function AlertDescription({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"type-body text-ink group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-2",
				className
			)}
			data-slot="alert-description"
			{...props}
		/>
	);
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("absolute top-1/2 right-4 -translate-y-1/2", className)}
			data-slot="alert-action"
			{...props}
		/>
	);
}

export { Alert, AlertAction, AlertDescription, AlertTitle };
