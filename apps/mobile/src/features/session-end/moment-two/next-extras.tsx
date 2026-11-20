import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { EaseView } from "@/design/ease";
import { popProps } from "@/design/entering";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import type { Domain, ListenerCard, NextParts } from "../session-end-data";
import { LAYOUT } from "../session-look";

const N = LAYOUT.next;
const L = COPY.next.listener;
const UNLOCK_POP_MS = 1900;
const UNLOCK_POP_FROM = 0.5;
const PART_ICON = 20;
const STANDING = "text-[13px] leading-[17px]";

export function XolacerLead({
	listener,
	parts,
}: {
	listener: ListenerCard;
	parts: NextParts;
}) {
	return parts.listenerAvatar(listener, N.icon);
}

export function XolacerBody({
	listener,
	title,
}: {
	listener: ListenerCard;
	title: string;
}) {
	const { rating, present } = listener;
	return (
		<View className="min-w-0 flex-1 gap-0.5">
			<AppText
				style={{ fontSize: N.title, lineHeight: N.titleLine }}
				variant="subhead"
				weight="semibold"
			>
				{title}
			</AppText>
			<View className="flex-row items-center gap-1.5">
				{rating === undefined ? (
					<View className="h-5 justify-center rounded-[10px] bg-accent-wash px-2">
						<AppText
							className="text-[11.5px] leading-[14px]"
							color="accentInk"
							variant="caption"
							weight="semibold"
						>
							{L.newXolacer}
						</AppText>
					</View>
				) : (
					<AppText className={STANDING} variant="footnote" weight="semibold">
						{L.rating(rating)}
					</AppText>
				)}
				<AppText
					className={STANDING}
					color={present ? "successInk" : "muted"}
					variant="footnote"
					weight={present ? "semibold" : "regular"}
				>
					{`· ${present ? L.hereNow : L.repliesInADay}`}
				</AppText>
			</View>
			<AppText
				className="mt-0.5"
				color="muted"
				numberOfLines={2}
				style={{ fontSize: N.sub, lineHeight: N.subLine }}
				variant="detail"
			>
				{L.sub}
			</AppText>
		</View>
	);
}

export function InsightLead({
	kind,
	domain,
	parts,
	reduced,
}: {
	kind: "unlock" | "upsell";
	domain: Domain;
	parts: NextParts;
	reduced: boolean;
}) {
	const accentInk = useTokenColor("accent-ink");
	const emberInk = useTokenColor("ember-ink");
	const up = kind === "upsell";
	const icon = (
		<Icon
			color={up ? emberInk : accentInk}
			name={parts.partIcon(domain)}
			size={PART_ICON}
		/>
	);
	return (
		<View
			className={
				up
					? "items-center justify-center bg-ember-wash"
					: "items-center justify-center bg-accent-wash"
			}
			style={{ borderRadius: N.iconRadius, height: N.icon, width: N.icon }}
		>
			{up ? (
				icon
			) : (
				<EaseView {...popProps(UNLOCK_POP_MS, reduced, UNLOCK_POP_FROM)}>
					{icon}
				</EaseView>
			)}
		</View>
	);
}

export function InsightBody({
	kind,
	text,
}: {
	kind: "unlock" | "upsell";
	text: { title: string; sub: string };
}) {
	const up = kind === "upsell";
	return (
		<View className="min-w-0 flex-1 gap-0.5">
			<AppText
				numberOfLines={2}
				style={{ fontSize: N.title, lineHeight: N.titleLine }}
				variant="subhead"
				weight="semibold"
			>
				{text.title}
			</AppText>
			<AppText
				color={up ? "emberInk" : "muted"}
				numberOfLines={up ? 1 : 2}
				style={{ fontSize: N.sub, lineHeight: N.subLine }}
				variant="detail"
				weight={up ? "semibold" : "regular"}
			>
				{text.sub}
			</AppText>
		</View>
	);
}
