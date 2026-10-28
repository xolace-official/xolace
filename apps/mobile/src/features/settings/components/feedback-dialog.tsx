import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Button, Dialog, TextArea } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { DialogBlurBackdrop } from "@/components/dialog-blur-backdrop";
import { AppText } from "@/components/shared/app-text";

const MAX_LENGTH = 1000;

function extractErrorMessage(e: unknown): string {
	if (!(e instanceof Error)) {
		return "Something went wrong";
	}
	const match = e.message.match(/Uncaught Error: (.+?)(?:\n|$)/);
	return match ? match[1] : e.message;
}

type Props = {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
};

const FeedbackForm = ({
	onOpenChange,
}: {
	onOpenChange: (open: boolean) => void;
}) => {
	const [text, setText] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const submitFeedback = useMutation(api.feedback.submit);
	const canSubmit = useQuery(api.feedback.canSubmitGeneral);
	const posthog = usePostHog();

	const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isSubmittingRef = useRef(false);

	useEffect(
		() => () => {
			if (closeTimerRef.current) {
				clearTimeout(closeTimerRef.current);
			}
		},
		[]
	);

	const isRateLimited = canSubmit === false;
	const isDisabled = isSaving || !text.trim() || isRateLimited || sent;

	const handleSend = async () => {
		if (isDisabled || isSubmittingRef.current) {
			return;
		}
		isSubmittingRef.current = true;
		setIsSaving(true);
		setError(null);
		try {
			await submitFeedback({ text: text.trim(), type: "general" });
			setSent(true);
			posthog.capture("feedback_submitted", {
				has_option: false,
				has_text: true,
				type: "general",
			});
			if (closeTimerRef.current) {
				clearTimeout(closeTimerRef.current);
			}
			closeTimerRef.current = setTimeout(() => onOpenChange(false), 1500);
		} catch (e) {
			setError(extractErrorMessage(e));
		} finally {
			setIsSaving(false);
			isSubmittingRef.current = false;
		}
	};

	return (
		<Dialog.Content className="mx-auto w-full max-w-sm">
			<View className="mb-4 gap-1">
				<Dialog.Title>Send feedback</Dialog.Title>
				<Dialog.Description>What&apos;s on your mind?</Dialog.Description>
			</View>

			<TextArea
				accessibilityHint="Up to 1000 characters"
				className="mb-1 min-h-30"
				isDisabled={isSaving || sent}
				maxLength={MAX_LENGTH}
				onChangeText={(t: string) => {
					setText(t);
					setError(null);
				}}
				placeholder="Tell us what you think..."
				value={text}
			/>

			<AppText className="mb-2 text-right text-foreground/30 text-xs">
				{text.length} / {MAX_LENGTH}
			</AppText>

			{isRateLimited && (
				<AppText className="mt-1 mb-2 text-foreground/55 text-xs">
					You&apos;ve sent feedback today. Come back tomorrow.
				</AppText>
			)}

			{error && (
				<AppText className="mt-1 mb-2 text-danger/80 text-xs">{error}</AppText>
			)}

			<View className="mt-1 flex-row justify-end gap-3">
				<Button
					isDisabled={isSaving}
					onPress={() => onOpenChange(false)}
					size="sm"
					variant="ghost"
				>
					Cancel
				</Button>
				<Button
					accessibilityLabel="Send feedback"
					isDisabled={isDisabled}
					onPress={handleSend}
					size="sm"
					variant="primary"
				>
					{sent ? "Sent." : isSaving ? "Sending..." : "Send"}
				</Button>
			</View>
		</Dialog.Content>
	);
};

export const FeedbackDialog = ({ isOpen, onOpenChange }: Props) => (
	<Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
		<Dialog.Portal>
			<DialogBlurBackdrop />
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				{isOpen && <FeedbackForm onOpenChange={onOpenChange} />}
			</KeyboardAvoidingView>
		</Dialog.Portal>
	</Dialog>
);
