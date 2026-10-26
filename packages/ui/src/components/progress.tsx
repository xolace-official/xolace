"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { cn } from "@xolace/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const indicatorVariants = cva(
	"relative h-full min-w-4 rounded-full transition-[width] duration-400 ease-[cubic-bezier(.2,.9,.3,1.2)] after:absolute after:top-1 after:right-2 after:left-2 after:h-1 after:rounded-full after:bg-white/35 motion-reduce:transition-none",
	{
		defaultVariants: { tone: "mint" },
		variants: {
			tone: {
				coral: "bg-coral",
				ember: "bg-ember",
				lavender: "bg-lavender",
				mint: "bg-mint",
				pink: "bg-pink",
				sky: "bg-sky",
			},
		},
	}
);

// Chunky, fully rounded bar with a highlight stripe on the fill. Mint by
// default (progress is good news); ember near a limit, coral past it.
function Progress({
	className,
	children,
	value,
	tone,
	...props
}: ProgressPrimitive.Root.Props & VariantProps<typeof indicatorVariants>) {
	return (
		<ProgressPrimitive.Root
			className={cn("flex flex-wrap items-baseline gap-x-3 gap-y-2", className)}
			data-slot="progress"
			value={value}
			{...props}
		>
			{children}
			<ProgressTrack>
				<ProgressIndicator tone={tone} />
			</ProgressTrack>
		</ProgressPrimitive.Root>
	);
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
	return (
		<ProgressPrimitive.Track
			className={cn(
				"relative flex h-4 w-full items-center overflow-hidden rounded-full bg-surface-sunken shadow-[inset_0_0_0_2px_var(--line)]",
				className
			)}
			data-slot="progress-track"
			{...props}
		/>
	);
}

function ProgressIndicator({
	className,
	tone,
	...props
}: ProgressPrimitive.Indicator.Props & VariantProps<typeof indicatorVariants>) {
	return (
		<ProgressPrimitive.Indicator
			className={cn(indicatorVariants({ tone }), className)}
			data-slot="progress-indicator"
			{...props}
		/>
	);
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
	return (
		<ProgressPrimitive.Label
			className={cn("type-body-strong text-ink", className)}
			data-slot="progress-label"
			{...props}
		/>
	);
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
	return (
		<ProgressPrimitive.Value
			className={cn("type-data ml-auto text-ink-muted", className)}
			data-slot="progress-value"
			{...props}
		/>
	);
}

export {
	Progress,
	ProgressIndicator,
	ProgressLabel,
	ProgressTrack,
	ProgressValue,
};
