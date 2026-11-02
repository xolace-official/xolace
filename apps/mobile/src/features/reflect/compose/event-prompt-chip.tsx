import { SymbolView } from "expo-symbols";
import { Button, Popover } from "heroui-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/components/shared/app-text";
import { posthog } from "@/config/posthog";
import { playSoftPress } from "@/lib/haptics";
import { useAppStore } from "@/store/store";

const EVENT_ICON_NAME = {
	android: "favorite",
	ios: "heart.fill",
	web: "favorite",
} as const;

type Props = {
	label: string | null;
};

/** The event pill; tapping it offers to clear the prompt so the card goes back to its usual
 * line. */
export const EventPromptChip = ({ label }: Props) => {
	const [eventColor] = useCSSVariable(["--color-event"]);
	const setPendingEventPrompt = useAppStore((s) => s.setPendingEventPrompt);
	const [isOpen, setIsOpen] = useState(false);
	const title = label ?? "This month";

	const clearPrompt = () => {
		playSoftPress();
		setIsOpen(false);
		setPendingEventPrompt(null);
		posthog.capture("event_prompt_cleared", { label });
	};

	return (
		<Popover isOpen={isOpen} onOpenChange={setIsOpen}>
			<Popover.Trigger asChild>
				<Pressable
					accessibilityHint="Shows the option to clear this prompt"
					accessibilityLabel={`${title} prompt`}
					accessibilityRole="button"
					className="max-w-full self-start"
					hitSlop={8}
					onPressIn={playSoftPress}
				>
					<View className="max-w-full flex-row items-center gap-1.5 self-start rounded-full bg-event/15 px-3 py-1">
						<SymbolView
							name={EVENT_ICON_NAME}
							size={11}
							tintColor={String(eventColor)}
						/>
						<AppText
							className="shrink font-semibold text-event text-xs"
							numberOfLines={1}
						>
							{title}
						</AppText>
					</View>
				</Pressable>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Overlay />
				<Popover.Content
					align="start"
					className="gap-3 rounded-2xl border border-border bg-surface px-5 py-4"
					placement="bottom"
					presentation="popover"
					width={284}
				>
					<View className="gap-1.5">
						<AppText
							className="font-medium text-foreground text-sm"
							numberOfLines={2}
						>
							{title}
						</AppText>
						<AppText className="text-[12px] text-foreground/55 leading-5">
							Not feeling this prompt? Clear it and your card goes back to its
							usual question.
						</AppText>
					</View>
					<Button
						className="self-start"
						onPress={clearPrompt}
						size="sm"
						variant="tertiary"
					>
						Clear prompt
					</Button>
				</Popover.Content>
			</Popover.Portal>
		</Popover>
	);
};
