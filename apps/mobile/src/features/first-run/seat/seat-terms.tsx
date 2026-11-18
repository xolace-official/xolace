import { useState } from "react";
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

/** "By continuing you agree to the Terms and Privacy Policy." Each opens production's legal sheet. */
export function SeatTerms({ eng }: { eng: SharedValue<SEng> }) {
	const [doc, setDoc] = useState<LegalDocument | null>(null);
	const style = useAnimatedStyle(() => {
		const e = eng.get();
		const inn = e.rm ? 1 : ease(seg(seatAge(e), 900, 1300));
		return { opacity: inn * (1 - seatedOut(e)) };
	});
	const color = ink(0.45);
	return (
		<Animated.View style={style}>
			<AppText
				className="text-center"
				style={{ color, fontSize: 11.5, lineHeight: 15 }}
			>
				{SEAT.termsBefore}
				<AppText
					accessibilityRole="link"
					className="underline"
					onPress={() => setDoc(TERMS_OF_SERVICE)}
					style={{ color, fontSize: 11.5 }}
				>
					{SEAT.terms}
				</AppText>
				{SEAT.termsAnd}
				<AppText
					accessibilityRole="link"
					className="underline"
					onPress={() => setDoc(PRIVACY_POLICY)}
					style={{ color, fontSize: 11.5 }}
				>
					{SEAT.privacy}
				</AppText>
				{SEAT.termsAfter}
			</AppText>
			<LegalBottomSheet document={doc} onClose={() => setDoc(null)} />
		</Animated.View>
	);
}
