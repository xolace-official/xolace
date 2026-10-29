"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@xolace/ui/lib/utils";

// On/off for settings that apply at once. The track turns mint when on.
function Switch({
	className,
	size = "default",
	...props
}: SwitchPrimitive.Root.Props & {
	size?: "sm" | "default";
}) {
	return (
		<SwitchPrimitive.Root
			className={cn(
				"peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full outline-none transition-colors after:absolute after:-inset-x-3 after:-inset-y-2 data-[size=default]:h-8 data-[size=sm]:h-6 data-[size=default]:w-13 data-[size=sm]:w-10 data-disabled:cursor-not-allowed data-checked:bg-mint data-unchecked:bg-line-strong data-disabled:opacity-55",
				className
			)}
			data-size={size}
			data-slot="switch"
			{...props}
		>
			<SwitchPrimitive.Thumb
				className="pointer-events-none ml-1 block rounded-full bg-surface shadow-[0_var(--depth-sm)_0_rgba(0,0,0,0.18)] transition-transform duration-180 ease-[cubic-bezier(.3,1.4,.5,1)] data-checked:bg-on-mint group-data-[size=default]/switch:size-6 group-data-[size=sm]/switch:size-4 group-data-[size=default]/switch:data-checked:translate-x-5 group-data-[size=sm]/switch:data-checked:translate-x-4 motion-reduce:transition-none"
				data-slot="switch-thumb"
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch };
