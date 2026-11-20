import { useState } from "react";
import { TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SettingsDialog } from "@/components/settings-kit/settings-dialog";
import { AppText } from "@/components/shared/app-text";
import { FOLLOW_COPY } from "@/features/settings/follow/copy";
import { useFollowScreen } from "@/features/settings/follow/follow-data";
import {
	FEEDBACK_MAX,
	feedbackView,
} from "@/features/settings/follow/follow-model";
import { cn } from "@/lib/cn";
import { useKeyboardShown } from "@/lib/keyboard/use-keyboard-shown";

const D = FOLLOW_COPY.dialog;

const TOP = 200;
const GAP = 14;
const CHROME = 150;
const KEYBOARD = 380;
const EDGE = 12;

function useDialogTop(body: number) {
	const shown = useKeyboardShown();
	const { height } = useWindowDimensions();
	const { top } = useSafeAreaInsets();
	if (!shown) {
		return TOP;
	}
	const clear = height - KEYBOARD - CHROME - body;
	return Math.max(top + EDGE, Math.min(TOP, clear));
}

export function FeedbackDialog() {
	const { state, actions } = useFollowScreen();
	const f = state.feedback;
	const view = feedbackView(f);
	const [body, setBody] = useState(0);
	const top = useDialogTop(body);
	return (
		<SettingsDialog
			cancel={D.cancel}
			desc={D.desc}
			gap={GAP}
			ok={view.ok}
			okDisabled={view.okDisabled}
			onCancel={actions.closeFeedback}
			onOk={actions.sendFeedback}
			open={f.open}
			title={D.title}
			top={top}
		>
			<View onLayout={(e) => setBody(e.nativeEvent.layout.height)}>
				<TextInput
					accessibilityHint={D.hint}
					accessibilityLabel={D.title}
					autoFocus
					className={cn(
						"mt-3.5 max-h-44 min-h-30 rounded-[13px] border-[1.5px] border-continuous bg-surface-secondary px-3.5 py-3 font-normal text-[16px] text-foreground leading-[22.4px]",
						f.draft ? "border-accent" : "border-transparent"
					)}
					editable={view.editable}
					maxLength={FEEDBACK_MAX}
					multiline
					onChangeText={actions.setDraft}
					placeholder={D.placeholder}
					placeholderTextColorClassName="accent-foreground/40"
					selectionColorClassName="accent-accent"
					style={{ textAlignVertical: "top" }}
					value={f.draft}
				/>
				<AppText
					className="mt-1.25 text-right text-[12px] text-foreground/35 leading-4"
					variant="body"
				>
					{view.count}
				</AppText>
				{view.limited ? (
					<AppText
						className="mt-1 text-[13px] text-foreground/58 leading-[18px]"
						variant="body"
					>
						{D.limited}
					</AppText>
				) : null}
				{f.error ? (
					<AppText
						accessibilityLiveRegion="polite"
						accessibilityRole="alert"
						className="mt-1 text-[13px] text-danger leading-[18px]"
						variant="body"
					>
						{f.error}
					</AppText>
				) : null}
			</View>
		</SettingsDialog>
	);
}
