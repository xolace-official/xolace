import { View } from "react-native";
import {
	KeyboardAwareScrollView,
	KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { BackButton } from "@/components/shared/back-button";
import { CtaButton } from "@/components/shared/cta-button";
import { Flux } from "@/components/shared/flux";
import type { IconName } from "@/components/shared/icon";
import { useBridgeScreen } from "@/features/care/bridge/bridge-data";
import { recipientOf } from "@/features/care/bridge/bridge-model";
import { QuietButton } from "@/features/care/bridge/chrome/buttons";
import { DonePill } from "@/features/care/bridge/chrome/done-pill";
import { COPY } from "@/features/care/bridge/copy";
import { DraftCard } from "@/features/care/bridge/draft/draft-card";
import { DraftLoading } from "@/features/care/bridge/draft/draft-loading";
import { DraftNotice } from "@/features/care/bridge/draft/draft-notice";
import { playSoftPress } from "@/lib/haptics";

const FLUX_W = 44;
const FLUX_H = 56;
/** Production's: keeps the draft's caret clear of the keyboard and the two buttons above it. */
const KEYBOARD_GAP = 170;
/** The native large title's size, which the prototype drew this with. */
const TITLE = { fontSize: 34, lineHeight: 38 } as const;

/** The draft: written for them, editable, shared through the phone's own sheet. */
export function DraftStep() {
	const { state, actions } = useBridgeScreen();
	const { draft } = state;
	const name = recipientOf(state.recipient.name);
	const loading = draft.status === "loading";
	const insets = useSafeAreaInsets();

	return (
		<View className="flex-1">
			<View className="h-14 flex-row items-center justify-between px-4">
				<BackButton
					haptic={playSoftPress}
					label={COPY.draft.back}
					onPress={actions.back}
				/>
				{draft.shared ? <DonePill onPress={actions.complete} /> : null}
				{draft.shared || loading ? null : (
					<Flux
						breathe
						height={FLUX_H}
						label={COPY.draft.mascot}
						pose="bundle"
						width={FLUX_W}
					/>
				)}
			</View>
			{loading ? (
				<DraftLoading />
			) : (
				<>
					<KeyboardAwareScrollView
						bottomOffset={KEYBOARD_GAP}
						className="flex-1"
						contentContainerClassName="gap-3.5 px-4 pt-3 pb-5"
						keyboardDismissMode="interactive"
						keyboardShouldPersistTaps="handled"
					>
						<View className="gap-2 px-1">
							<AppText accessibilityRole="header" style={TITLE} variant="title">
								{COPY.draft.title(name)}
							</AppText>
							<AppText color="muted" variant="callout">
								{COPY.draft.sub}
							</AppText>
						</View>
						<DraftNotice />
						<DraftCard />
					</KeyboardAwareScrollView>
					<KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
						<View className="gap-1.5 bg-background px-4 pt-2 pb-safe-or-4">
							<CtaButton
								haptic={playSoftPress}
								label={COPY.draft.share(name)}
								onPress={actions.share}
							/>
							<QuietButton label={COPY.draft.later} onPress={actions.dismiss} />
						</View>
					</KeyboardStickyView>
				</>
			)}
		</View>
	);
}
