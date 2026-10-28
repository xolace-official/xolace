import { View } from "react-native";

import { AppText } from "@/components/shared/app-text";

import {
	type AudienceKey,
	FOUNDER_MESSAGE,
	RETURNING_CALLOUT,
	RETURNING_CALLOUT_LABEL,
	type Segment,
} from "@/features/intake/founder-message/letter-copy";

const PARAGRAPH_CLASS =
	"text-foreground/80 text-[15px] leading-6.5 font-[Poppins-Regular]";

const renderSegments = (segments: Segment[]) =>
	segments.map((seg) =>
		seg.highlight ? (
			<AppText className="font-[Poppins-Medium] text-accent" key={seg.text}>
				{seg.text}
			</AppText>
		) : (
			seg.text
		)
	);

type Props = { audience: AudienceKey };

export const LetterBody = ({ audience }: Props) => (
	<View className="gap-4">
		{FOUNDER_MESSAGE.paragraphs.map((segments) => (
			<AppText className={PARAGRAPH_CLASS} key={segments[0].text}>
				{renderSegments(segments)}
			</AppText>
		))}

		{audience === "existing" ? (
			<View className="mt-1 rounded-2xl border-accent border-l-2 bg-accent/10 px-4 py-3">
				<AppText className="mb-1 font-[Poppins-Medium] text-[11px] text-accent/65 uppercase tracking-widest">
					{RETURNING_CALLOUT_LABEL}
				</AppText>
				<AppText className="font-[Poppins-Regular] text-[15px] text-foreground/85 leading-6">
					{renderSegments(RETURNING_CALLOUT)}
				</AppText>
			</View>
		) : null}

		<AppText className={PARAGRAPH_CLASS}>{FOUNDER_MESSAGE.transition}</AppText>

		<View className="pt-3">
			<AppText className="font-[Poppins-Regular] text-foreground/65 text-sm">
				{FOUNDER_MESSAGE.closing}
			</AppText>
			<AppText className="mt-1 font-[Poppins-Regular] text-[17px] text-foreground/55 tracking-wide">
				{FOUNDER_MESSAGE.signature}
			</AppText>
		</View>
	</View>
);
