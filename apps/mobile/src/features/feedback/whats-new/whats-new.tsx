import { ScrollView, useWindowDimensions, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { useTokenColor } from "@/lib/use-token-color";
import { FEEDBACK_COPY } from "../copy";
import { WHATS_NEW } from "./whats-new-entries";

/** The list scrolls inside the sheet past half the window. */
const LIST_SHARE = 0.5;

/** Read-only release notes, newest first: each release's name and month, then its highlights. */
export function WhatsNew() {
	const accent = useTokenColor("accent");
	const { height } = useWindowDimensions();
	return (
		<View className="px-4">
			<AppText accessibilityRole="header" className="mb-3" variant="title">
				{FEEDBACK_COPY.whatsNew.title}
			</AppText>
			<ScrollView
				nestedScrollEnabled
				showsVerticalScrollIndicator={false}
				style={{ maxHeight: height * LIST_SHARE }}
			>
				<View className="gap-section">
					{WHATS_NEW.map((entry) => (
						<View className="gap-3" key={entry.id}>
							<View className="flex-row items-baseline justify-between">
								<AppText variant="headline">{entry.label}</AppText>
								<AppText color="subtle" variant="footnote">
									{entry.date}
								</AppText>
							</View>
							{entry.highlights.map((h) => (
								<View className="flex-row gap-3" key={h.title}>
									<Icon color={accent} name={h.icon} size={18} />
									<View className="flex-1 gap-0.5">
										<AppText variant="callout" weight="semibold">
											{h.title}
										</AppText>
										<AppText color="muted" variant="footnote">
											{h.body}
										</AppText>
									</View>
								</View>
							))}
						</View>
					))}
				</View>
			</ScrollView>
		</View>
	);
}
