import { ActivityIndicator, TextInput, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { QuoteIcon } from "../chrome/quote-icons";
import type { InkPalette } from "../chrome/quote-ink";
import { QUOTE_COPY } from "../copy";
import { REPLY_MAX } from "../quotes-model";
import { QuoteSheet } from "./quote-sheet";
import { SheetButton, SheetNote } from "./sheet-parts";

const A11Y = QUOTE_COPY.accessibility;
const SAID = "text-[17px] leading-[24.5px]";

type Props = {
	ink: InkPalette;
	dark: boolean;
	step: "writing" | "sent" | "flagged";
	draft: string;
	sending: boolean;
	reaches: boolean;
	onDraft: (s: string) => void;
	onSend: () => void;
	onEdit: () => void;
	onReflect: () => void;
	onTalk: () => void;
	onClose: () => void;
};

export function WriteSheet(p: Props) {
	const { ink } = p;
	const said = { color: ink.sheetText } as const;
	if (p.step === "sent") {
		return (
			<QuoteSheet
				closeLabel={A11Y.close}
				ink={ink}
				label={QUOTE_COPY.sheets.sent}
				onClose={p.onClose}
				title={QUOTE_COPY.sheets.sent}
			>
				<AppText className={SAID} style={said} variant="body">
					{p.draft.trim()}
				</AppText>
				<View className="h-px" style={{ backgroundColor: ink.line }} />
				{p.reaches && <SheetNote ink={ink}>{QUOTE_COPY.listened}</SheetNote>}
				<View className="flex-row items-center gap-2.5">
					<SheetButton
						ink={ink}
						kind="ghost"
						label={QUOTE_COPY.edit}
						onPress={p.onEdit}
					/>
					<View className="flex-1" />
					<SheetButton
						ink={ink}
						kind="primary"
						label={QUOTE_COPY.reflect}
						onPress={p.onReflect}
					/>
				</View>
			</QuoteSheet>
		);
	}
	if (p.step === "flagged") {
		return (
			<QuoteSheet
				closeLabel={A11Y.close}
				ink={ink}
				label={QUOTE_COPY.sheets.flagged}
				onClose={p.onClose}
				title={QUOTE_COPY.sheets.flagged}
			>
				<AppText className={SAID} style={said} variant="body">
					{p.draft.trim()}
				</AppText>
				<View
					className="gap-2.5 rounded-[22px] border-continuous px-4 py-3.5"
					style={{ backgroundColor: ink.fill }}
				>
					<AppText
						className="text-[15px] leading-[21px]"
						style={said}
						variant="callout"
						weight="medium"
					>
						{QUOTE_COPY.support}
					</AppText>
					<View className="flex-row gap-2.5">
						<SheetButton
							className="flex-1"
							ink={ink}
							kind="primary"
							label={QUOTE_COPY.talk}
							onPress={p.onTalk}
						/>
						<SheetButton
							ink={ink}
							kind="ghost"
							label={QUOTE_COPY.notNow}
							onPress={p.onClose}
						/>
					</View>
				</View>
				<SheetNote ink={ink}>{QUOTE_COPY.keptEither}</SheetNote>
			</QuoteSheet>
		);
	}
	return (
		<QuoteSheet
			closeLabel={A11Y.closeKeepDraft}
			ink={ink}
			label={QUOTE_COPY.sheets.write}
			onClose={p.onClose}
			title={QUOTE_COPY.sheets.write}
		>
			<AppText
				className="text-[15px]"
				style={{ color: ink.sheetText2 }}
				variant="callout"
				weight="medium"
			>
				{QUOTE_COPY.prompt}
			</AppText>
			<TextInput
				accessibilityLabel={QUOTE_COPY.yourReply}
				className="h-33 rounded-[22px] border-[0.5px] border-continuous px-4 py-3.5 font-normal text-[16.5px] leading-[24px]"
				editable={!p.sending}
				keyboardAppearance={p.dark ? "dark" : "light"}
				maxLength={REPLY_MAX}
				multiline
				onChangeText={p.onDraft}
				placeholder={QUOTE_COPY.placeholder}
				placeholderTextColor={ink.sheetText2}
				selectionColor={ink.sheetText}
				style={{
					backgroundColor: ink.fill,
					borderColor: ink.line,
					color: ink.sheetText,
					textAlignVertical: "top",
				}}
				value={p.draft}
			/>
			<View className="flex-row items-center gap-2.5">
				<View className="flex-1 flex-row items-center gap-1.5">
					<QuoteIcon color={ink.sheetText2} name="lock" size={13} />
					<AppText
						className="text-[12.5px]"
						style={{ color: ink.sheetText2 }}
						variant="caption"
						weight="medium"
					>
						{QUOTE_COPY.private}
					</AppText>
				</View>
				<SheetButton
					disabled={!p.draft.trim() || p.sending}
					ink={ink}
					kind="primary"
					label={QUOTE_COPY.keepIt}
					onPress={p.onSend}
				>
					{p.sending && (
						<ActivityIndicator color={ink.buttonText} size="small" />
					)}
				</SheetButton>
			</View>
		</QuoteSheet>
	);
}
