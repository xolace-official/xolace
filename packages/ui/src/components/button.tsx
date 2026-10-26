import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cn } from "@xolace/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

// A solid fill sitting on its own darker lip; it sinks flush when pressed.
const buttonVariants = cva(
	"group/button pressable lip disabled:lip-line data-disabled:lip-line inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-md border-0 font-display font-extrabold uppercase tracking-[0.04em] outline-none hover:brightness-[1.07] disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-muted disabled:hover:brightness-100 aria-invalid:outline-2 aria-invalid:outline-coral data-disabled:cursor-not-allowed data-disabled:bg-surface-sunken data-disabled:text-ink-muted [&_svg:not([class*='size-'])]:size-5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[2.5]",
	{
		defaultVariants: {
			size: "default",
			variant: "default",
		},
		variants: {
			size: {
				default: "depth-md h-12 px-5 text-[15px] leading-5",
				icon: "depth-md size-12",
				"icon-lg": "depth-lg size-14 rounded-lg",
				"icon-sm":
					"depth-sm size-9 rounded-sm [&_svg:not([class*='size-'])]:size-4",
				"icon-xs":
					"depth-sm size-7 rounded-sm [&_svg:not([class*='size-'])]:size-3.5",
				lg: "depth-lg h-14 rounded-lg px-8 text-[17px] leading-[22px] [&_svg:not([class*='size-'])]:size-[22px]",
				sm: "depth-sm h-9 gap-1.5 rounded-sm px-4 text-[13px] leading-4 [&_svg:not([class*='size-'])]:size-4",
				xs: "depth-sm h-7 gap-1 rounded-sm px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
			},
			variant: {
				/** Lavender: the one action the screen is for. */
				default: "lip-lavender-lip bg-lavender text-on-lavender",
				/** Coral: says what it destroys ("Ban user"). */
				destructive: "lip-coral-lip bg-coral text-on-coral",
				ghost:
					"bg-transparent text-lavender-text [--lip-depth:0px]! hover:bg-surface-sunken hover:brightness-100 disabled:bg-transparent data-disabled:bg-transparent",
				link: "bg-transparent px-0 text-sky-text normal-case tracking-normal underline-offset-4 [--lip-depth:0px]! hover:underline hover:brightness-100",
				/** Neutral: Cancel, Back, filters, toolbars. */
				outline:
					"lip-line border-2 border-line bg-surface text-ink hover:bg-surface-sunken hover:brightness-100 aria-expanded:bg-surface-sunken",
				/** Sky: a real second action. */
				secondary: "lip-sky-lip bg-sky text-on-sky",
				/** Mint: approve, resolve. */
				success: "lip-mint-lip bg-mint text-on-mint",
				/** Ember: reversible attention actions (snooze, escalate). */
				warning: "lip-ember-lip bg-ember text-on-ember",
			},
		},
	}
);

function Button({
	className,
	variant = "default",
	size = "default",
	...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
	return (
		<ButtonPrimitive
			className={cn(buttonVariants({ className, size, variant }))}
			data-slot="button"
			{...props}
		/>
	);
}

export { Button, buttonVariants };
