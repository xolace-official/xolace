import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { EmptyState } from "@/components/shared/empty-state";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";

const ARCHIVE = { android: "archive", ios: "archivebox" } as const;

export type EmptyNote = { title: string; body: string; browse?: () => void };

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

function EmptyChats({ note }: { note: EmptyNote }) {
	return (
		<EmptyState
			action={
				note.browse
					? { label: COPY.empty.browse, onPress: note.browse }
					: undefined
			}
			body={note.body}
			className="py-12"
			face
			title={note.title}
		/>
	);
}
