import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Button, PressableFeedback, TextArea, useToast } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { useStableQuery } from "@/lib/convex/use-stable-query";
import { cn } from "@/lib/utils";
import { useTray } from "../engine/tray-provider";
import { useFeedbackContext } from "../use-feedback-context";

const MAX_LENGTH = 1000;
type Kind = "bug" | "idea" | "concern";

const COPY: Record<
	Kind,
	{ title: string; placeholder: string; rateLimited: string; sent: string }
> = {
	bug: {
		placeholder: "What happened? What did you expect instead?",
		rateLimited: "You've sent a lot of feedback today. Come back tomorrow.",
		sent: "We read every piece of feedback.",
		title: "Report a bug",
	},
	concern: {
		placeholder:
			"What happened? Anything you can tell us helps us look into it.",
		// Mirrors the server's message. A rate-limited reporter may have a real
		// safety problem and no route left in the app, so the copy names one.
		rateLimited:
			"You've reached today's report limit. If this is urgent, email support@xolaceinc.com and a human will pick it up.",
		sent: "A person on our team reads every report.",
		title: "Report a concern",
	},
	idea: {
		placeholder: "What would you love to see?",
		rateLimited: "You've sent a lot of feedback today. Come back tomorrow.",
		sent: "We read every piece of feedback.",
		title: "Suggest an idea",
	},
};

function extractErrorMessage(e: unknown): string {
	if (!(e instanceof Error)) {
		return "Something went wrong";
	}
	const match = e.message.match(/Uncaught Error: (.+?)(?:\n|$)/);
	return match ? match[1] : e.message;
}

export type ReportSubject = {
	/** Stable identity of the person being reported. */
	profileId: Id<"emotional_profiles">;
	/** Form copy only, never sent to the backend. */
	name: string;
	/** Present when the concern was raised inside a thread. */
	conversationId?: Id<"xolacer_conversations">;
};

/** Bug | idea report form, plus a concern mode for reporting a person. */
export const ReportForm = ({
	kind: initialKind,
	subject,
}: {
	kind: Kind;
	subject?: ReportSubject;
}) => {
	const [kind, setKind] = useState<Kind>(initialKind);
	const isConcern = initialKind === "concern";
	const [text, setText] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { dismiss } = useTray();
	const { toast } = useToast();
	const posthog = usePostHog();
	const context = useFeedbackContext();

	const submit = useMutation(api.productFeedback.submit);
	// Stable: a plain `useQuery` returns `undefined` while the new budget loads,
	// which would drop the notice and re-enable submit mid-tap.
	const canSubmit = useStableQuery(api.productFeedback.canSubmit, { kind });

	const isRateLimited = canSubmit === false;
	const isDisabled = isSaving || !text.trim() || isRateLimited;

	const handleSubmit = async () => {
		if (isDisabled) {
			return;
		}
		setIsSaving(true);
		setError(null);
		try {
			await submit({
				context,
				conversationId: subject?.conversationId,
				kind,
				subjectProfileId: subject?.profileId,
				text: text.trim(),
			});
			posthog.capture("product_feedback_submitted", { kind });
			toast.show({
				description: COPY[kind].sent,
				label: "Thank you.",
			});
			dismiss();
		} catch (e) {
			setError(extractErrorMessage(e));
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<View className="gap-3">
			<AppText className="font-semibold text-foreground text-lg">
				{COPY[kind].title}
			</AppText>

			{/* The name is display-only; the id is what gets submitted. */}
			{isConcern && subject && (
				<AppText className="text-foreground/65 text-sm">
					About {subject.name}
				</AppText>
			)}

			{!isConcern && (
				<View className="flex-row gap-2">
					{(["bug", "idea"] as const).map((k) => {
						const active = k === kind;
						return (
							<PressableFeedback
								accessibilityLabel={
									k === "bug" ? "Report a bug" : "Suggest an idea"
								}
								className={cn(
									"flex-1 items-center rounded-full py-2.5",
									active ? "bg-accent" : "bg-foreground/5"
								)}
								key={k}
								onPress={() => setKind(k)}
							>
								<AppText
									className={cn(
										"text-sm",
										active ? "text-accent-foreground" : "text-foreground/65"
									)}
								>
									{k === "bug" ? "Bug" : "Idea"}
								</AppText>
							</PressableFeedback>
						);
					})}
				</View>
			)}

			<TextArea
				accessibilityHint="Up to 1000 characters"
				autoFocus
				className="min-h-30"
				isDisabled={isSaving}
				maxLength={MAX_LENGTH}
				onChangeText={(t: string) => {
					setText(t);
					setError(null);
				}}
				placeholder={COPY[kind].placeholder}
				value={text}
			/>

			<AppText className="text-right text-foreground/30 text-xs">
				{text.length} / {MAX_LENGTH}
			</AppText>

			{isRateLimited && (
				<AppText className="text-foreground/55 text-xs">
					{COPY[kind].rateLimited}
				</AppText>
			)}

			{error && <AppText className="text-danger/80 text-xs">{error}</AppText>}

			<Button
				accessibilityLabel={isConcern ? "Send report" : "Send feedback"}
				isDisabled={isDisabled}
				onPress={handleSubmit}
				variant="primary"
			>
				{isSaving ? "Sending..." : "Send"}
			</Button>
		</View>
	);
};
