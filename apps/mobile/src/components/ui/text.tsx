import { Children, forwardRef, type ReactElement, type ReactNode } from "react";
import type { TextProps as RNTextProps, TextInstance } from "react-native";
import { tv, type VariantProps } from "tailwind-variants";
import { AppText } from "@/components/shared/app-text";
import { useDirection } from "@/helpers/hooks/use-direction";

const textVariants = tv({
	base: "text-foreground",
	defaultVariants: {
		size: "base",
		weight: "normal",
	},
	variants: {
		muted: {
			true: "text-muted",
		},
		size: {
			"2xl": "text-2xl",
			"3xl": "text-3xl",
			base: "text-base",
			lg: "text-lg",
			sm: "text-sm",
			xl: "text-xl",
			xs: "text-xs",
		},
		weight: {
			bold: "font-bold",
			medium: "font-medium",
			normal: "font-normal",
			semibold: "font-semibold",
		},
	},
});

export interface TextProps
	extends RNTextProps,
		VariantProps<typeof textVariants> {
	className?: string;
}

export const Text = forwardRef<TextInstance, TextProps>(
	({ className, size, weight, muted, style, ...props }, ref) => {
		const direction = useDirection();

		return (
			<AppText
				className={textVariants({ className, muted, size, weight })}
				ref={ref}
				style={[{ writingDirection: direction }, style]}
				{...props}
			/>
		);
	}
);

Text.displayName = "Text";

export function textChildren(
	children: ReactNode,
	render: (text: string | number) => ReactElement = (text) => (
		<Text>{text}</Text>
	)
): ReactNode {
	return Children.map(children, (child) =>
		typeof child === "string" || typeof child === "number"
			? render(child)
			: child
	);
}
