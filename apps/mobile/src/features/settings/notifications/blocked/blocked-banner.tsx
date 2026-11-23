import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { GlassButton } from "@/components/shared/glass-button";
import { Icon } from "@/components/shared/icon";
import {
	NOTIFY_COPY,
	NOTIFY_ICONS,
} from "@/features/settings/notifications/copy";
import { useTokenColor } from "@/lib/use-token-color";

const C = NOTIFY_COPY.banner;

export function BlockedBanner({
	onOpenSettings,
}: {
	onOpenSettings: () => void;
}) {
	const danger = useTokenColor("danger");
	return (
		<View
			accessibilityRole="summary"
			className="mx-4 mb-4 flex-row gap-3 rounded-[20px] border border-continuous border-danger/22 bg-danger-wash p-3.5"
		>
			<View className="size-7.5 items-center justify-center rounded-[9px] border-continuous bg-danger/16">
				<Icon color={danger} name={NOTIFY_ICONS.blocked} size={17} />
			</View>
			<View className="flex-1 gap-0.5">
				<AppText
					className="text-[15px] leading-[19px]"
					variant="body"
					weight="semibold"
				>
					{C.title}
				</AppText>
				<AppText
					className="text-[13.5px] text-foreground/70 leading-[19px]"
					variant="body"
				>
					{C.body}
				</AppText>
				<GlassButton
					className="mt-2 h-8 justify-center self-start rounded-full px-3.25"
					onPress={onOpenSettings}
				>
					<AppText
						className="text-[14px] text-background leading-[18px]"
						variant="body"
						weight="semibold"
					>
						{C.cta}
					</AppText>
				</GlassButton>
			</View>
		</View>
	);
}
