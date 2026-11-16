import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Card } from "@/components/shared/card";
import { Icon, type IconName } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { cn, tv } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";

const PHONE: IconName = { android: "call", ios: "phone.fill" };
const PHONE_GLYPH = 13;
const ROW_RADIUS = 22;

/** The action pill: `care` is a care line (danger wash); `accent` is the peer row. */
const pill = tv({
	base: "h-10 flex-row items-center gap-1.5 rounded-full px-4",
	variants: { tone: { accent: "bg-accent-wash", care: "bg-danger-wash" } },
});

type Props = {
	title: string;
	sub: string;
	action: string;
	onPress: () => void;
	tone?: "care" | "accent";
	/** Call rows lead with a phone glyph; the peer row asks instead. */
	phone?: boolean;
	className?: string;
};

/**
 * A resource row: what it is, who answers, and Call under your thumb.
 * @public The redesign's shared kit (F5), for the screen PRs.
 */
export function CareRow({
	title,
	sub,
	action,
	onPress,
	tone = "care",
	phone,
	className,
}: Props) {
	const dangerInk = useTokenColor("danger-ink");
	return (
		<Card
			className={cn("flex-row items-center gap-3 py-3 pr-3 pl-4", className)}
			flat
			radius={ROW_RADIUS}
		>
			<View className="flex-1 gap-0.5">
				<AppText variant="subhead" weight="semibold">
					{title}
				</AppText>
				<AppText color="muted" variant="footnote">
					{sub}
				</AppText>
			</View>
			<PressScale
				accessibilityLabel={`${action}: ${title}`}
				className={pill({ tone })}
				onPress={onPress}
			>
				{phone ? (
					<Icon color={dangerInk} name={PHONE} size={PHONE_GLYPH} />
				) : null}
				<AppText
					className="text-[15.5px]"
					color={tone === "care" ? "dangerInk" : "accentInk"}
					variant="callout"
					weight="semibold"
				>
					{action}
				</AppText>
			</PressScale>
		</Card>
	);
}
