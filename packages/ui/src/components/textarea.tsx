import { cn } from "@xolace/ui/lib/utils";
import type * as React from "react";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			className={cn(
				"field-sizing-content type-body flex min-h-26 w-full min-w-0 resize-y rounded-md border-2 border-line bg-surface-sunken px-3 py-3 text-ink outline-none transition-[border-color,background-color,box-shadow] placeholder:text-ink-muted hover:border-line-strong focus-visible:border-focus focus-visible:bg-surface focus-visible:shadow-[0_var(--depth-sm)_0_var(--focus)] focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-coral aria-invalid:bg-coral-soft aria-invalid:focus-visible:shadow-[0_var(--depth-sm)_0_var(--coral-lip)]",
				className
			)}
			data-slot="textarea"
			{...props}
		/>
	);
}

export { Textarea };
