import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@xolace/ui/lib/utils";
import type * as React from "react";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<InputPrimitive
			className={cn(
				"type-body h-12 w-full min-w-0 rounded-md border-2 border-line bg-surface-sunken px-3 py-2 text-ink outline-none transition-[border-color,background-color,box-shadow] file:inline-flex file:h-8 file:border-0 file:bg-transparent file:font-semibold file:text-ink placeholder:text-ink-muted hover:border-line-strong focus-visible:border-focus focus-visible:bg-surface focus-visible:shadow-[0_var(--depth-sm)_0_var(--focus)] focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-coral aria-invalid:bg-coral-soft aria-invalid:focus-visible:shadow-[0_var(--depth-sm)_0_var(--coral-lip)]",
				className
			)}
			data-slot="input"
			type={type}
			{...props}
		/>
	);
}

export { Input };
