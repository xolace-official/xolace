import { StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/shared/app-text";
import { SpecialtyChips } from "../components/specialty-chips";
import { XolacerAvatar } from "../components/xolacer-avatar";
import type { SetupDraft } from "./steps";

const styles = StyleSheet.create({
	borderCurve: { borderCurve: "continuous" },
});

/**
 * A preview of the roster row and profile header, so nobody publishes without
 * having seen the thing other people will actually read.
 */
export function ReviewStep({ draft }: { draft: SetupDraft }) {
	return (
		<View className="gap-3 pt-4">
			<View
				className="items-center gap-2 rounded-3xl border border-border/40 bg-surface p-5"
				style={styles.borderCurve}
			>
				<XolacerAvatar
					name={draft.displayName || "?"}
					photoUrl={draft.photoUrl}
					size="lg"
				/>
				<AppText className="font-semibold text-foreground text-xl">
					{draft.displayName || "Your name"}
				</AppText>
				<AppText className="text-center text-[15px] text-foreground leading-6">
					&ldquo;{draft.bio || "Your bio"}&rdquo;
				</AppText>
				<SpecialtyChips
					className="justify-center"
					specialties={draft.specialties}
				/>
			</View>
			<AppText className="text-center text-[11px] text-muted leading-4">
				Publishing puts you on the roster. You can edit any of this later, and
				people only reach you by sending a request you can decline.
			</AppText>
		</View>
	);
}
