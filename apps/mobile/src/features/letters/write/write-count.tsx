import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Fade } from "../fade";

const COUNT = { height: 18, top: 8 };

/**
 * The count under the letter, near the limits. It reports its foot (its bottom, in the content
 * above it) so the keyboard lift keeps it clear of Send at any text size.
 */
export function WriteCount({
	count,
	on,
	reduced,
	onFoot,
}: {
	count: string;
	on: boolean;
	reduced: boolean;
	onFoot: (y: number) => void;
}) {
	return (
		<View
			onLayout={(e) => {
				const { y, height } = e.nativeEvent.layout;
				onFoot(y + height);
			}}
		>
			<Fade
				className="items-end justify-end px-7"
				on={on}
				reduced={reduced}
				style={{ minHeight: COUNT.top + COUNT.height }}
			>
				<AppText accessibilityElementsHidden color="subtle" variant="footnote">
					{count}
				</AppText>
			</Fade>
		</View>
	);
}
