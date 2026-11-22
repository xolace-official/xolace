import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Card } from "@/components/shared/card";
import { COPY } from "../copy";
import { StatusChip, Tag } from "../parts/chips";
import { XolacerAvatar } from "../parts/xolacer-avatar";
import type { RosterCard as Model } from "./roster-model";

export function RosterCard({
	card,
	onPress,
}: {
	card: Model;
	onPress: () => void;
}) {
	return (
		<Card
			className="gap-2.5 p-4"
			flat
			label={card.a11y}
			onPress={onPress}
			radius={26}
		>
			<View className="flex-row items-center gap-3">
				<XolacerAvatar
					id={card.id}
					muted={card.muted}
					name={card.name}
					online={card.present}
					photoUrl={card.photoUrl}
					size={56}
				/>
				<View className="min-w-0 flex-1 gap-0.5">
					<View className="flex-row flex-wrap items-center gap-1.75">
						<AppText
							className="shrink text-[17px]"
							numberOfLines={1}
							variant="subhead"
							weight="semibold"
						>
							{card.name}
						</AppText>
						{card.talking ? (
							<StatusChip label={COPY.roster.talking} tone="talking" />
						) : null}
					</View>
					<AppText
						className="text-[13.5px]"
						color={card.present && !card.muted ? "successInk" : "muted"}
						variant="footnote"
						weight={card.present && !card.muted ? "semibold" : "regular"}
					>
						{card.presence}
					</AppText>
				</View>
				{card.rating ? (
					<AppText variant="callout" weight="semibold">
						{card.rating}
					</AppText>
				) : (
					<StatusChip label={COPY.roster.newXolacer} tone="accent" />
				)}
			</View>
			<AppText className="leading-[22px]" variant="callout">
				{`“${card.bio}”`}
			</AppText>
			{card.tags.length ? (
				<View className="flex-row flex-wrap gap-1.5">
					{card.tags.map((tag) => (
						<Tag key={tag} label={tag} />
					))}
				</View>
			) : null}
		</Card>
	);
}
