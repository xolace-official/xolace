"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { toggleVariants } from "@xolace/ui/components/toggle";
import { cn } from "@xolace/ui/lib/utils";
import type { VariantProps } from "class-variance-authority";
import { createContext, use } from "react";

type ToggleGroupContextValue = VariantProps<typeof toggleVariants>;

const ToggleGroupContext = createContext<ToggleGroupContextValue>({
	size: "default",
	variant: "default",
});

// A row of chunky toggles (filters, view switches). Items inherit size/variant.
function ToggleGroup({
	className,
	variant,
	size,
	orientation = "horizontal",
	children,
	...props
}: ToggleGroupPrimitive.Props & ToggleGroupContextValue) {
	return (
		<ToggleGroupPrimitive
			className={cn(
				"group/toggle-group flex w-fit flex-row flex-wrap items-center gap-2 data-vertical:flex-col data-vertical:items-stretch",
				className
			)}
			data-orientation={orientation}
			data-size={size}
			data-slot="toggle-group"
			data-variant={variant}
			orientation={orientation}
			{...props}
		>
			<ToggleGroupContext value={{ size, variant }}>
				{children}
			</ToggleGroupContext>
		</ToggleGroupPrimitive>
	);
}

function ToggleGroupItem({
	className,
	children,
	variant = "default",
	size = "default",
	...props
}: TogglePrimitive.Props & ToggleGroupContextValue) {
	const context = use(ToggleGroupContext);

	return (
		<TogglePrimitive
			className={cn(
				"shrink-0",
				toggleVariants({
					size: context.size ?? size,
					variant: context.variant ?? variant,
				}),
				className
			)}
			data-size={context.size ?? size}
			data-slot="toggle-group-item"
			data-variant={context.variant ?? variant}
			{...props}
		>
			{children}
		</TogglePrimitive>
	);
}

export { ToggleGroup, ToggleGroupItem };
