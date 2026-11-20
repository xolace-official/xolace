import { FEEDBACK_MAX_CHARS } from "@xolace/backend/shared";
import { TextInput, View } from "react-native";
import { SheetButton } from "@/components/settings-kit/sheet-button";
import { AppText } from "@/components/shared/app-text";
import type { Choice } from "@/components/shared/choice-props";
import { Segmented } from "@/components/shared/segmented";
import { cn } from "@/lib/cn";
import { FEEDBACK_COPY } from "../copy";
import { useFeedbackScreen } from "../feedback-data";
import { reportView } from "../feedback-model";

const R = FEEDBACK_COPY.report;
const KINDS: readonly Choice<"bug" | "idea">[] = [
	{ id: "bug", label: R.tabs.bug },
	{ id: "idea", label: R.tabs.idea },
];

export function ReportForm() {
	const { state, actions } = useFeedbackScreen();
	const concern = state.kind === "concern";
	const words = R[state.kind];
	const view = reportView(state);
	return (
		<View className="px-4">
			<AppText accessibilityRole="header" variant="title">
				{words.title}
			</AppText>
			{concern && state.subjectName ? (
				<AppText className="mt-1" color="muted" variant="callout">
					{R.about(state.subjectName)}
				</AppText>
			) : null}
			{concern ? null : (
				<Segmented
					className="mt-3.5"
					onChange={actions.setKind}
					options={KINDS}
					value={state.kind === "idea" ? "idea" : "bug"}
				/>
			)}
			<TextInput
				accessibilityHint={R.hint}
				accessibilityLabel={words.title}
				autoFocus
				className={cn(
					"mt-3.5 max-h-44 min-h-30 rounded-[13px] border-[1.5px] border-continuous bg-surface-secondary px-3.5 py-3 font-normal text-[16px] text-foreground leading-[22.4px]",
					state.text ? "border-accent" : "border-transparent"
				)}
				editable={!state.saving}
				maxLength={FEEDBACK_MAX_CHARS}
				multiline
				onChangeText={actions.setText}
				placeholder={words.placeholder}
				placeholderTextColorClassName="accent-foreground/40"
				selectionColorClassName="accent-accent"
				style={{ textAlignVertical: "top" }}
				value={state.text}
			/>
			<AppText className="mt-1.25 text-right" color="subtle" variant="caption">
				{view.count}
			</AppText>
			{state.limited ? (
				<AppText className="mt-1" color="muted" variant="footnote">
					{words.rateLimited}
				</AppText>
			) : null}
			{state.error ? (
				<AppText
					accessibilityLiveRegion="polite"
					accessibilityRole="alert"
					className="mt-1"
					color="dangerInk"
					variant="footnote"
				>
					{state.error}
				</AppText>
			) : null}
			<View className="mt-4">
				<SheetButton
					busy={state.saving}
					disabled={view.sendDisabled}
					label={view.send}
					onPress={actions.send}
					primary
				/>
			</View>
		</View>
	);
}
