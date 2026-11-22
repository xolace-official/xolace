import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon, type IconName } from "@/components/shared/icon";
import { useBridgeScreen } from "@/features/care/bridge/bridge-data";
import { noticeOf } from "@/features/care/bridge/bridge-model";
import { useTokenColor } from "@/lib/use-token-color";

const ICON: Record<"rate_limited" | "error", IconName> = {
	error: { android: "error_outline", ios: "exclamationmark.circle" },
	rate_limited: { android: "schedule", ios: "clock" },
};
const GLYPH = 15;

export function DraftNotice() {
	const { state } = useBridgeScreen();
	const muted = useTokenColor("muted");
	const notice = noticeOf(state.draft.status);
	if (!notice) {
		return null;
	}
	return (
		<View
			accessibilityLiveRegion="polite"
			accessible
			className="flex-row items-start gap-3 rounded-row bg-surface-secondary px-4 py-3"
		>
			<Icon color={muted} name={ICON[notice.kind]} size={GLYPH} />
			<AppText className="flex-1" color="muted" variant="footnote">
				{notice.text}
			</AppText>
		</View>
	);
}
