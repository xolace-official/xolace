import { Pressable, TextInput, View } from "react-native";
import {
	fieldBorder,
	SettingsDialog,
} from "@/components/settings-kit/settings-dialog";
import { visibleLength } from "@/components/settings-kit/settings-layout";
import { AppText } from "@/components/shared/app-text";
import { cn } from "@/lib/cn";

/** The words a name dialog shows; each screen's `copy.ts` supplies them. */
export type NameDialogCopy = {
	title: string;
	desc: string;
	/** The label above the field. */
	field: string;
	cancel: string;
	save: string;
	/** The "Reset to Ember" link, when the name has a default to go back to. */
	reset?: string;
};

type Props = {
	open: boolean;
	copy: NameDialogCopy;
	/** The most characters, as a person counts them (shown in the field). */
	max: number;
	draft: string;
	onDraft: (v: string) => void;
	/** What's wrong with the draft (the backend's own validator), or "" when it can be saved. */
	error: string;
	onCancel: () => void;
	onSave: (trimmed: string) => void;
	/** Shown with `copy.reset` when given. */
	onReset?: () => void;
	autoCapitalize?: "none" | "words";
};

/**
 * Name a thing (your name, your space): the count sits in the field, the
 * validator's own words say what's wrong, and Save waits until it's fine.
 * @public The redesign's shared kit (F5), for the screen PRs.
 */
export function NameDialog({
	open,
	copy,
	max,
	draft,
	onDraft,
	error,
	onCancel,
	onSave,
	onReset,
	autoCapitalize = "none",
}: Props) {
	const bad = error !== "";
	const save = () => {
		if (!bad) {
			onSave(draft.trim());
		}
	};
	return (
		<SettingsDialog
			cancel={copy.cancel}
			desc={copy.desc}
			ok={copy.save}
			okDisabled={bad}
			onCancel={onCancel}
			onOk={save}
			open={open}
			title={copy.title}
		>
			<AppText
				className="mt-4 text-[13px] text-foreground/62 leading-[17px]"
				variant="body"
				weight="semibold"
			>
				{copy.field}
			</AppText>
			<View
				className={cn(
					"mt-1.5 h-11.5 flex-row items-center rounded-[13px] border-[1.5px] border-continuous bg-surface-secondary px-3.5",
					fieldBorder(bad)
				)}
			>
				<TextInput
					accessibilityLabel={copy.title}
					autoCapitalize={autoCapitalize}
					autoCorrect={false}
					autoFocus
					className="flex-1 py-0 font-normal text-[17px] text-foreground"
					onChangeText={onDraft}
					onSubmitEditing={save}
					returnKeyType="done"
					selectionColorClassName="accent-accent"
					value={draft}
				/>
				<AppText
					className="text-[12.5px] text-foreground/42 leading-4"
					variant="body"
				>
					{`${visibleLength(draft)}/${max}`}
				</AppText>
			</View>
			{bad ? (
				<AppText
					accessibilityLiveRegion="polite"
					accessibilityRole="alert"
					className="mt-1.5 text-[13px] text-danger leading-[18px]"
					variant="body"
				>
					{error}
				</AppText>
			) : null}
			{onReset && copy.reset ? (
				<Pressable
					accessibilityRole="button"
					className="mt-2.5 self-start"
					onPress={onReset}
				>
					<AppText
						className="text-[14.5px] text-accent leading-5"
						variant="body"
						weight="medium"
					>
						{copy.reset}
					</AppText>
				</Pressable>
			) : null}
		</SettingsDialog>
	);
}
