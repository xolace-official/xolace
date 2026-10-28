import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { PressableFeedback, Switch, TextArea, useToast } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import {
	REFLECTIVE_COPY,
	REFLECTIVE_DONE,
	REFLECTIVE_SAVED,
	REFLECTIVE_SAVED_SHARED,
	REFLECTIVE_SAVING,
	REFLECTIVE_SHARE_LABEL,
	REFLECTIVE_SKIP,
	type ReflectiveAnswer,
	streakNod,
} from "@/features/follow-up/follow-up-copy";
import { Icon, OptionCard } from "@/features/follow-up/stack-cards";
import { playAffirmativePress, playErrorNotice } from "@/lib/haptics";

// Mirrors REFLECTION_MAX_LENGTH in convex/followUpResponses.ts (not imported:
// that module is server code).
const MAX_LENGTH = 2000;

const TINT: Record<ReflectiveAnswer, string> = {
	lighter: "bg-success/20",
	processed: "bg-ember/25",
};

type Props = {
	answer: ReflectiveAnswer;
	cardId: Id<"follow_up_cards">;
	streak: number;
	/** False on acute / escalation cards (presence-first); the server also refuses acute and
	 * crisis. */
	canShare: boolean;
	onClose: () => void;
};

/** Reflective step for `lighter` (#449) and `processed` (#450). Done persists the note; Skip
 * and X just leave. */
export function ReflectiveStep({
	answer,
	cardId,
	streak,
	canShare,
	onClose,
}: Props) {
	const posthog = usePostHog();
	const record = useMutation(api.followUpResponses.record);
	const contributeByDefault =
		useQuery(api.preferences.getContributeByDefault) ?? false;
	const [text, setText] = useState("");
	const [shareChoice, setShareChoice] = useState<boolean | null>(null);
	const [saving, setSaving] = useState(false);
	const { toast } = useToast();
	const hasText = text.trim().length > 0;
	const share = canShare && hasText && (shareChoice ?? contributeByDefault);
	const copy = REFLECTIVE_COPY[answer];
	const nod = streakNod(streak);

	const done = async () => {
		if (saving) {
			return;
		}
		setSaving(true);
		const saved = await record({
			cardId,
			reflectionText: text,
			shareRequested: share,
		}).catch(() => false);
		if (!saved) {
			// Keep the editor open with the note intact so the user can retry.
			setSaving(false);
			playErrorNotice();
			toast.show({ label: "Couldn't save that. Try again?" });
			return;
		}
		posthog.capture(`follow_up_${answer}_done`, {
			has_text: hasText,
			shared: share,
		});
		// An empty Done closes quietly. The toast provider sits above the route,
		// so the toast outlives the close.
		if (hasText) {
			playAffirmativePress();
			toast.show({ label: share ? REFLECTIVE_SAVED_SHARED : REFLECTIVE_SAVED });
		}
		onClose();
	};

	return (
		<>
			<View className="-mb-8 overflow-hidden rounded-t-[36px] bg-surface">
				<View className={`${TINT[answer]} px-5 pt-5 pb-12`}>
					{copy.milestone && (
						<View className="mb-3 flex-row items-center gap-2.5">
							<Icon name="seal" size={24} />
							<AppText className="flex-1 font-medium text-base text-foreground">
								{copy.milestone}
							</AppText>
						</View>
					)}
					{nod && (
						<View
							accessibilityLabel={`${streak}-day streak. ${nod}`}
							className="mb-4 flex-row items-center gap-2"
						>
							<Icon name="flame" size={16} />
							<AppText className="flex-1 text-foreground/70 text-sm">
								{nod}
							</AppText>
						</View>
					)}
					<TextArea
						accessibilityLabel={copy.inputA11y}
						className="min-h-28"
						maxLength={MAX_LENGTH}
						onChangeText={setText}
						placeholder={copy.placeholder}
						value={text}
					/>
					{canShare && (
						<View className="mt-4 flex-row items-center gap-3">
							<AppText
								className={
									hasText
										? "flex-1 text-foreground"
										: "flex-1 text-foreground/40"
								}
							>
								{REFLECTIVE_SHARE_LABEL}
							</AppText>
							<Switch
								accessibilityLabel={REFLECTIVE_SHARE_LABEL}
								isDisabled={!hasText}
								isSelected={share}
								onSelectedChange={setShareChoice}
							>
								<Switch.Thumb />
							</Switch>
						</View>
					)}
				</View>
			</View>
			<OptionCard
				icon="check"
				onPress={done}
				tint="bg-surface"
				title={saving ? REFLECTIVE_SAVING : REFLECTIVE_DONE}
			/>
			<View className="items-center bg-surface pt-4">
				<PressableFeedback
					accessibilityRole="button"
					className="min-h-11 items-center justify-center"
					hitSlop={12}
					onPress={onClose}
				>
					<AppText className="text-foreground/55 text-sm">
						{REFLECTIVE_SKIP}
					</AppText>
				</PressableFeedback>
			</View>
		</>
	);
}
