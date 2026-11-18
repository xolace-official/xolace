import { ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Flux } from "@/components/shared/flux";
import type { IconName } from "@/components/shared/icon";
import { useBridgeScreen } from "@/features/care/bridge/bridge-data";
import { recipientOf } from "@/features/care/bridge/bridge-model";
import {
	PrimaryButton,
	QuietButton,
} from "@/features/care/bridge/chrome/buttons";
import { DonePill } from "@/features/care/bridge/chrome/done-pill";
import { RoundButton } from "@/features/care/bridge/chrome/round-button";
import { COPY } from "@/features/care/bridge/copy";
import { DraftCard } from "@/features/care/bridge/draft/draft-card";
import { DraftLoading } from "@/features/care/bridge/draft/draft-loading";
import { DraftNotice } from "@/features/care/bridge/draft/draft-notice";
import { KeyboardSpacer } from "@/lib/keyboard/keyboard-spacer";

const BACK: IconName = { android: "arrow_back", ios: "chevron.left" };
const FLUX_W = 44;
const FLUX_H = 56;
/** The native large title's size, which the prototype drew this with. */
const TITLE = { fontSize: 34, lineHeight: 38 } as const;

/** The draft: written for them, editable, shared through the phone's own sheet. */
export function DraftStep() {
	const { state, actions } = useBridgeScreen();
	const { draft } = state;
	const name = recipientOf(state.recipient.name);
	const loading = draft.status === "loading";

	return (
		<View className="flex-1">
			<View className="h-14 flex-row items-center justify-between px-4">
				<RoundButton
					icon={BACK}
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
					<ScrollView
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
					</ScrollView>
					<View className="gap-1.5 px-4 pt-2 pb-safe-or-4">
						<PrimaryButton
							label={COPY.draft.share(name)}
							onPress={actions.share}
						/>
						<QuietButton label={COPY.draft.later} onPress={actions.dismiss} />
					</View>
					<KeyboardSpacer />
				</>
			)}
		</View>
	);
}
