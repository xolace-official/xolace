import { SymbolView } from "expo-symbols";
import { Popover } from "heroui-native";
import { Pressable } from "react-native";
import { AppText } from "@/src/components/shared/app-text";
import { useTokenColor } from "../hooks/use-token-color";

type Props = {
	title: string;
	description: string;
};

/**
 * Small info affordance beside a card title. Tapping the icon opens a popover
 * explaining what the card shows. The trigger is its own Pressable so it claims
 * the touch and never fires the surrounding card's press handler.
 */
export function CardInfo({ title, description }: Props) {
	const muted = useTokenColor("muted");

	return (
		<Popover>
			<Popover.Trigger asChild>
				<Pressable
					accessibilityLabel={`About ${title}`}
					accessibilityRole="button"
					hitSlop={10}
				>
					<SymbolView
						name={{ android: "info", ios: "info.circle", web: "info" }}
						size={13}
						tintColor={muted + "AA"}
					/>
				</Pressable>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Overlay />
				<Popover.Content
					align="start"
					className="rounded-2xl border border-border bg-surface px-5 py-4"
					placement="bottom"
					presentation="popover"
					width={284}
				>
					<AppText className="mb-1.5 font-medium text-foreground text-sm">
						{title}
					</AppText>
					<AppText className="text-[12px] text-foreground/55 leading-5">
						{description}
					</AppText>
				</Popover.Content>
			</Popover.Portal>
		</Popover>
	);
}
