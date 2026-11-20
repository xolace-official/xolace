import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Card } from "@/components/shared/card";
import { Icon } from "@/components/shared/icon";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { StatusChip, Tag } from "../parts/chips";
import { XolacerAvatar } from "../parts/xolacer-avatar";
import { SETUP } from "./copy";
import { chipLabel, type SetupDraft } from "./setup-model";

const AVATAR = 56;
const CAMERA = { android: "photo_camera", ios: "camera" } as const;

/**
 * The roster card exactly as people will meet it (`roster-card.tsx`), with "New Xolacer" where
 * ratings go. What's missing shows as a muted stand-in, so the gap is plain without a warning.
 */
export function SetupReview({ draft }: { draft: SetupDraft }) {
	const muted = useTokenColor("muted");
	const name = draft.displayName.trim();
	const bio = draft.bio.trim();
	return (
		<View className="gap-4">
			<Card className="gap-2.5 p-4" flat radius={26}>
				<View className="flex-row items-center gap-3">
					{draft.photoUrl ? (
						<XolacerAvatar
							id="you"
							name={name}
							photoUrl={draft.photoUrl}
							size={AVATAR}
						/>
					) : (
						<View className="size-14 items-center justify-center rounded-full bg-surface-secondary">
							<Icon color={muted} name={CAMERA} size={20} />
						</View>
					)}
					<AppText
						className="min-w-0 flex-1 text-[17px]"
						color={name ? "foreground" : "muted"}
						numberOfLines={1}
						variant="subhead"
						weight="semibold"
					>
						{name || SETUP.review.noName}
					</AppText>
					<StatusChip label={COPY.roster.newXolacer} tone="accent" />
				</View>
				<AppText
					className="leading-[22px]"
					color={bio ? "foreground" : "muted"}
					variant="callout"
				>
					{bio ? `“${bio}”` : SETUP.review.noBio}
				</AppText>
				{draft.specialties.length ? (
					<View className="flex-row flex-wrap gap-1.5">
						{draft.specialties.map((slug) => (
							<Tag key={slug} label={chipLabel(slug)} />
						))}
					</View>
				) : null}
			</Card>
			<AppText className="px-1" color="muted" variant="footnote">
				{SETUP.review.fine}
			</AppText>
		</View>
	);
}
