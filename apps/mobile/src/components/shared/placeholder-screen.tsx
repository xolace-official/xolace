import { ScrollView } from "react-native";
import { AppText } from "@/components/shared/app-text";

type Props = {
	title: string;
	/** One quiet line under the title. */
	note?: string;
};

/**
 * Stands in for a screen until its own lands: a centred title on the theme's
 * background. A scroll view, so a tab bar finds it (minimize on scroll, edge
 * effects).
 */
export function PlaceholderScreen({ title, note }: Props) {
	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerClassName="grow items-center justify-center gap-2 p-gutter"
			contentInsetAdjustmentBehavior="automatic"
		>
			<AppText center variant="title" weight="semibold">
				{title}
			</AppText>
			{note ? (
				<AppText center color="muted" variant="footnote">
					{note}
				</AppText>
			) : null}
		</ScrollView>
	);
}
