// Terms · Privacy · Restore where the subscription is sold (App Review 3.1.2), so someone who
// already subscribed can get it back without leaving intake.
import { Spinner } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { LegalBottomSheet } from "@/components/shared/legal-bottom-sheet";
import {
	type LegalDocument,
	PRIVACY_POLICY,
	TERMS_OF_SERVICE,
} from "@/components/shared/legal-content";
import { PressScale } from "@/components/shared/press-scale";
import { useTokenColor } from "@/lib/use-token-color";
import { FIRST_LOOK } from "../copy";
import { useFirstLookData } from "../first-look-data";

const HIT = 12;

function Link({
	disabled,
	label,
	onPress,
}: {
	disabled: boolean;
	label: string;
	onPress: () => void;
}) {
	return (
		<PressScale
			accessibilityLabel={label}
			accessibilityRole="link"
			accessibilityState={{ disabled }}
			disabled={disabled}
			hitSlop={HIT}
			onPress={onPress}
		>
			<AppText className="underline" color="subtle" variant="caption">
				{label}
			</AppText>
		</PressScale>
	);
}

export function LegalLinks() {
	const { actions, state } = useFirstLookData();
	const subtle = useTokenColor("subtle");
	const [doc, setDoc] = useState<LegalDocument | null>(null);
	const lock = state.busy || state.buying;
	return (
		<>
			<View className="min-h-4.5 flex-row items-center justify-center gap-4.5">
				<Link
					disabled={false}
					label={FIRST_LOOK.legal.terms}
					onPress={() => setDoc(TERMS_OF_SERVICE)}
				/>
				<Link
					disabled={false}
					label={FIRST_LOOK.legal.privacy}
					onPress={() => setDoc(PRIVACY_POLICY)}
				/>
				{state.restoring ? (
					<Spinner color={subtle} size="sm" />
				) : (
					<Link
						disabled={lock}
						label={FIRST_LOOK.legal.restore}
						onPress={actions.restore}
					/>
				)}
			</View>
			<LegalBottomSheet document={doc} onClose={() => setDoc(null)} />
		</>
	);
}
