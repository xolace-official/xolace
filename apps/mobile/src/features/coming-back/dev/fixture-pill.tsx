/** Today's pill on fixtures, alone under a stand-in greeting; a tap does nothing. */
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { NotificationBanner } from "@/features/coming-back/banner/notification-banner";
import { pillLabelOf } from "@/features/coming-back/coming-back-model";
import { ReturnPill } from "@/features/coming-back/pill/return-pill";
import { ReturnPillProvider } from "@/features/coming-back/return-pill-data";

const PAD_TOP = 60;
const BANNER_TEXT =
	"Your check-in from Tuesday is still here, whenever you’re ready.";
const noop = () => undefined;

export function FixturePill({ ck, pm }: { ck: boolean; pm: boolean }) {
	const insets = useSafeAreaInsets();
	return (
		<View
			className="flex-1 bg-background px-4"
			style={{ paddingTop: insets.top + PAD_TOP }}
		>
			<AppText variant="greeting">Good evening, Ama</AppText>
			<ReturnPillProvider
				value={{
					actions: { open: noop },
					state: {
						ck,
						closeKey: 0,
						label: pillLabelOf({ ck, pm }, "Tuesday"),
						pm,
						reduced: false,
					},
				}}
			>
				<ReturnPill fallback={null} />
			</ReturnPillProvider>
		</View>
	);
}

/** The "You were reached" banner over a plain page; it stays until tapped or 8 s pass. */
export function FixtureBanner() {
	return (
		<View className="flex-1 bg-background">
			<NotificationBanner content={BANNER_TEXT} onDismiss={noop} />
		</View>
	);
}
