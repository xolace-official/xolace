import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@xolace/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

// Tinted label for status, counts and categories. A status badge always
// carries a word (and for mint/ember/coral an icon), never hue alone.
// `solid` (with a lip) is for counts only.
const badgeVariants = cva(
	"group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-sm px-2 font-sans font-semibold text-xs leading-4 transition-colors [&>svg]:pointer-events-none [&>svg]:size-3.5! [&>svg]:stroke-3",
	{
		compoundVariants: [
			{
				class: "lip-lavender-lip bg-lavender text-on-lavender",
				solid: true,
				variant: "lavender",
			},
			{ class: "lip-sky-lip bg-sky text-on-sky", solid: true, variant: "sky" },
			{
				class: "lip-mint-lip bg-mint text-on-mint",
				solid: true,
				variant: "mint",
			},
			{
				class: "lip-ember-lip bg-ember text-on-ember",
				solid: true,
				variant: "ember",
			},
			{
				class: "lip-coral-lip bg-coral text-on-coral",
				solid: true,
				variant: "coral",
			},
			{
				class: "lip-pink-lip bg-pink text-on-pink",
				solid: true,
				variant: "pink",
			},
			{
				class: "lip-line-strong bg-surface text-ink",
				solid: true,
				variant: "neutral",
			},
		],
		defaultVariants: {
			solid: false,
			variant: "neutral",
		},
		variants: {
			solid: {
				false: "",
				true: "lip depth-sm min-w-6 font-display font-extrabold",
			},
			variant: {
				coral: "bg-coral-soft text-coral-text",
				ember: "bg-ember-soft text-ember-text",
				lavender: "bg-lavender-soft text-lavender-text",
				mint: "bg-mint-soft text-mint-text",
				neutral: "bg-surface-sunken text-ink-muted",
				pink: "bg-pink-soft text-pink-text",
				sky: "bg-sky-soft text-sky-text",
			},
		},
	}
);

function Badge({
	className,
	variant = "neutral",
	solid = false,
	render,
	...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
	return useRender({
		defaultTagName: "span",
		props: mergeProps<"span">(
			{
				className: cn(badgeVariants({ solid, variant }), className),
			},
			props
		),
		render,
		state: {
			slot: "badge",
			variant,
		},
	});
}

export { Badge, badgeVariants };
