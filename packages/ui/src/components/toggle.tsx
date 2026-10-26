"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cn } from "@xolace/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

// Same chunky shape as TabsTrigger: pressed is a lavender pill on its lip.
const toggleVariants = cva(
	"group/toggle aria-pressed:lip aria-pressed:lip-lavender-lip aria-pressed:depth-sm inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border-2 font-display font-extrabold text-ink-muted uppercase tracking-[0.04em] outline-none transition-colors hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-pressed:border-lavender aria-pressed:bg-lavender-soft aria-pressed:text-lavender-text [&_svg:not([class*='size-'])]:size-[18px] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[2.5]",
	{
		defaultVariants: {
			size: "default",
			variant: "default",
		},
		variants: {
			size: {
				default: "h-11 min-w-11 px-4 text-sm",
				lg: "h-12 min-w-12 px-5 text-[15px]",
				sm: "h-9 min-w-9 rounded-sm px-3 text-[13px] [&_svg:not([class*='size-'])]:size-4",
			},
			variant: {
				default: "border-transparent bg-transparent",
				outline: "border-line bg-surface",
			},
		},
	}
);

function Toggle({
	className,
	variant = "default",
	size = "default",
	...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
	return (
		<TogglePrimitive
			className={cn(toggleVariants({ className, size, variant }))}
			data-slot="toggle"
			{...props}
		/>
	);
}

export { Toggle, toggleVariants };
