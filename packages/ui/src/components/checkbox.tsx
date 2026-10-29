"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cn } from "@xolace/ui/lib/utils";
import { CheckIcon } from "lucide-react";

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
	return (
		<CheckboxPrimitive.Root
			className={cn(
				"peer pressable lip lip-line-strong depth-sm data-checked:lip-lavender-lip relative flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm border-2 border-line-strong bg-surface text-transparent outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-55 group-has-disabled/field:opacity-55 aria-invalid:border-coral data-disabled:cursor-not-allowed data-checked:border-lavender data-checked:bg-lavender data-checked:text-on-lavender data-disabled:opacity-55",
				className
			)}
			data-slot="checkbox"
			{...props}
		>
			<CheckboxPrimitive.Indicator
				className="grid place-content-center text-current transition-none [&>svg]:size-4 [&>svg]:stroke-[3.5]"
				data-slot="checkbox-indicator"
			>
				<CheckIcon />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };
