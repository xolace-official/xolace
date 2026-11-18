import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";

const ARCHIVE = { android: "archive", ios: "archivebox" } as const;

export type EmptyNote = { title: string; body: string; browse?: () => void };

/** Under the chats: the empty note when none is active, then the way into Archived. */
export function ChatsFooter({
	empty,
	archived,
}: {
	empty: EmptyNote | null;
	archived: { count: number; open: () => void };
}) {
	const muted = useTokenColor("muted");
	return (
		<View className="px-4">
			{empty ? <EmptyChats note={empty} /> : null}
			{archived.count > 0 ? (
				<PressScale
					accessibilityLabel={COPY.archivedRow.a11y(archived.count)}
					className="flex-row items-center gap-2.5 px-1 py-4"
					haptic={playSoftPress}
					onPress={archived.open}
				>
					<Icon color={muted} name={ARCHIVE} size={16} />
					<AppText className="text-[15.5px]" color="muted" variant="callout">
						{COPY.archivedRow.label(archived.count)}
					</AppText>
				</PressScale>
			) : null}
		</View>
	);
}

/** No chats yet, or all of them archived: a quiet note under the channel. */
function EmptyChats({ note }: { note: EmptyNote }) {
	return (
		<View className="items-center gap-2 px-6 py-12">
			<AppText center variant="headline">
				{note.title}
			</AppText>
			<AppText center className="max-w-70" color="muted" variant="callout">
				{note.body}
			</AppText>
			{note.browse ? (
				<PressScale
					accessibilityLabel={COPY.empty.browse}
					className="mt-2 min-h-11 justify-center px-3"
					haptic={playSoftPress}
					onPress={note.browse}
				>
					<AppText color="accentInk" variant="callout" weight="semibold">
						{`${COPY.empty.browse} →`}
					</AppText>
				</PressScale>
			) : null}
		</View>
	);
}
