import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { MIRROR_COPY as C } from "@/features/settings/mirror/copy";
import { playSoftPress } from "@/lib/haptics";

/** The strip under the pills when a free account looks at Witnessed (board `.gate`). */
export function ToneGate({ onSeePlus }: { onSeePlus: () => void }) {
	return (
		<View className="mx-4 mt-2.5 flex-row items-center gap-2.5 rounded-[16px] border-continuous bg-accent/12 py-2.5 pr-3 pl-3.5">
			<AppText className="flex-1 text-[14px] leading-[19px]" variant="body">
				{C.toneGate}
			</AppText>
			<Pressable
				accessibilityRole="button"
				className="h-8 justify-center rounded-full bg-surface px-3"
				onPress={() => {
					playSoftPress();
					onSeePlus();
				}}
			>
				<AppText
					className="text-[14px] leading-[18px]"
					color="accent"
					variant="body"
					weight="semibold"
				>
					{C.seePlus}
				</AppText>
			</Pressable>
		</View>
	);
}
