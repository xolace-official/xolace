import { useState } from "react";
import { Pressable, View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { LegalBottomSheet } from "@/components/shared/legal-bottom-sheet";
import {
	type LegalDocument,
	PRIVACY_POLICY,
	TERMS_OF_SERVICE,
} from "@/components/shared/legal-content";
import { SEAT } from "../copy";
import { ease, seg } from "../first-run-motion";
import { ink } from "../first-run-palette";
import type { SEng } from "../story/story-scene";
import { seatAge, seatedOut } from "./seat-in";

/** Each link's own touch target: 15 pt over and under its 15 pt line makes it about 44 pt. */
const LINK_SLOP = { bottom: 15, left: 8, right: 8, top: 15 };

/** The lead-in's words, each its own piece so the row wraps word by word at large type. */
const LEAD = SEAT.termsBefore.trim().split(" ");

/**
 * "By continuing you agree to the Terms and Privacy Policy." Each link opens production's legal
 * sheet. VoiceOver reads the lead-in once, from its first word.
 */
export function SeatTerms({ eng }: { eng: SharedValue<SEng> }) {
	const [doc, setDoc] = useState<LegalDocument | null>(null);
	const style = useAnimatedStyle(() => {
		const e = eng.get();
		const inn = e.rm ? 1 : ease(seg(seatAge(e), 900, 1300));
		return { opacity: inn * (1 - seatedOut(e)) };
	});
	const color = ink(0.45);
	const text = { color, fontSize: 11.5, lineHeight: 15 };
	const link = (label: string, document: LegalDocument) => (
		<Pressable
			accessibilityRole="link"
			hitSlop={LINK_SLOP}
			onPress={() => setDoc(document)}
		>
			<AppText className="underline" style={text}>
				{label}
			</AppText>
		</Pressable>
	);
	return (
		<Animated.View style={style}>
			<View className="flex-row flex-wrap items-center justify-center">
				{LEAD.map((word, i) => (
					<AppText
						accessibilityElementsHidden={i > 0}
						accessibilityLabel={i === 0 ? SEAT.termsBefore.trim() : undefined}
						importantForAccessibility={i > 0 ? "no" : "auto"}
						key={word}
						style={text}
					>
						{`${word} `}
					</AppText>
				))}
				{link(SEAT.terms, TERMS_OF_SERVICE)}
				<AppText style={text}>{SEAT.termsAnd}</AppText>
				<View className="flex-row">
					{link(SEAT.privacy, PRIVACY_POLICY)}
					<AppText style={text}>{SEAT.termsAfter}</AppText>
				</View>
			</View>
			<LegalBottomSheet document={doc} onClose={() => setDoc(null)} />
		</Animated.View>
	);
}
