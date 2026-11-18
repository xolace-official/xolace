import { useEffect, useRef } from "react";
import { type TextInputInstance, View } from "react-native";
import {
	KeyboardAwareScrollView,
	KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { BackButton } from "@/components/shared/back-button";
import { CtaButton } from "@/components/shared/cta-button";
import type { IconName } from "@/components/shared/icon";
import { useBridgeScreen } from "@/features/care/bridge/bridge-data";
import {
	ADDRESS_TERMS,
	canWrite,
	MAX_ADDRESS_TERM_LENGTH,
	MAX_NAME_LENGTH,
	RELATIONSHIPS,
	type Relationship,
} from "@/features/care/bridge/bridge-model";
import { QuotaHint } from "@/features/care/bridge/chrome/quota-hint";
import { COPY } from "@/features/care/bridge/copy";
import { Chips } from "@/features/care/bridge/recipient/chips";
import { Field } from "@/features/care/bridge/recipient/field";
import { playSoftPress } from "@/lib/haptics";

const CLOSE: IconName = { android: "close", ios: "xmark" };
/** Production's: keeps a focused field clear of the keyboard and the button above it. */
const KEYBOARD_GAP = 110;
/** Long enough for the address section to lay out before focus scrolls to it. */
const FOCUS_DELAY_MS = 50;
const isRelationship = (s: string): s is Relationship =>
	(RELATIONSHIPS as readonly string[]).includes(s);

function Section({ title, sub }: { title: string; sub: string }) {
	return (
		<View className="gap-0.5 px-1">
			<AppText variant="subhead" weight="semibold">
				{title}
			</AppText>
			<AppText color="muted" variant="footnote">
				{sub}
			</AppText>
		</View>
	);
}

/** Who it's for: their name, and optionally how they relate and what you call them. */
export function RecipientStep() {
	const { state, actions } = useBridgeScreen();
	const { name, relationship, addressTerm } = state.recipient;
	const addressRef = useRef<TextInputInstance>(null);
	const insets = useSafeAreaInsets();

	// A chosen relationship reveals the address field: focus it so it scrolls above the keyboard.
	useEffect(() => {
		if (!relationship) {
			return;
		}
		const t = setTimeout(() => addressRef.current?.focus(), FOCUS_DELAY_MS);
		return () => clearTimeout(t);
	}, [relationship]);

	return (
		<View className="flex-1">
			<View className="px-4 pt-2">
				<BackButton
					haptic={playSoftPress}
					icon={CLOSE}
					label={COPY.recipient.close}
					onPress={actions.dismiss}
				/>
			</View>
			<KeyboardAwareScrollView
				bottomOffset={KEYBOARD_GAP}
				className="flex-1"
				contentContainerClassName="gap-6 px-4 pt-4 pb-6"
				keyboardDismissMode="interactive"
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<View className="gap-2 px-1">
					<AppText accessibilityRole="header" variant="title">
						{COPY.recipient.title}
					</AppText>
					<AppText color="muted" variant="callout">
						{COPY.recipient.sub}
					</AppText>
				</View>
				<Field
					autoFocus
					label={COPY.recipient.nameLabel}
					max={MAX_NAME_LENGTH}
					onChange={actions.setName}
					placeholder={COPY.recipient.namePlaceholder}
					value={name}
				/>
				<View className="gap-3">
					<Section
						sub={COPY.recipient.relationshipSub}
						title={COPY.recipient.relationship}
					/>
					<Chips
						label={COPY.recipient.relationship}
						onPress={(r) => isRelationship(r) && actions.selectRelationship(r)}
						options={RELATIONSHIPS}
						value={relationship}
					/>
				</View>
				{relationship ? (
					<View className="gap-3">
						<Section
							sub={COPY.recipient.addressSub}
							title={COPY.recipient.address}
						/>
						{ADDRESS_TERMS[relationship].length > 0 ? (
							<Chips
								label={COPY.recipient.address}
								onPress={(term) =>
									actions.setAddressTerm(addressTerm === term ? null : term)
								}
								options={ADDRESS_TERMS[relationship]}
								value={addressTerm}
							/>
						) : null}
						<Field
							label={COPY.recipient.address}
							max={MAX_ADDRESS_TERM_LENGTH}
							onChange={actions.setAddressTerm}
							placeholder={COPY.recipient.addressPlaceholder}
							ref={addressRef}
							value={addressTerm ?? ""}
						/>
					</View>
				) : null}
			</KeyboardAwareScrollView>
			{/* Rides on the keyboard while it's up; tucks into the safe area when it's down. */}
			<KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
				<View className="gap-1.5 bg-background px-4 pt-2 pb-safe-or-4">
					<CtaButton
						disabled={!canWrite(name)}
						haptic={playSoftPress}
						label={COPY.recipient.write}
						onPress={actions.write}
					/>
					<QuotaHint />
				</View>
			</KeyboardStickyView>
		</View>
	);
}
