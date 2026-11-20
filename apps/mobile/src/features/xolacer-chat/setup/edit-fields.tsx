import { ActivityIndicator, TextInput, View } from "react-native";
import {
	Footnote,
	SectionTitle,
	SettingsCard,
} from "@/components/settings-kit/parts";
import { LABEL } from "@/components/settings-kit/settings-layout";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { Image } from "@/components/shared/styled";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColors } from "@/lib/use-token-color";
import { BIO_MAX_LENGTH, NAME_MAX_LENGTH } from "./steps";

const PHOTO = 112;
const CAMERA = { android: "photo_camera", ios: "camera.fill" } as const;
const BIO_LINES = 4;
/** The counter warns this close to the limit. */
const BIO_WARN_AT = 20;

/** The profile photo: the circle presses to pick a new one, which saves straight away. */
export function EditPhoto({
	photoUrl,
	uploading,
	onPick,
}: {
	photoUrl?: string;
	uploading: boolean;
	onPick: () => void;
}) {
	const [muted] = useTokenColors(["muted"]);
	return (
		<View className="items-center pt-4">
			<PressScale
				accessibilityLabel={photoUrl ? "Change your photo" : "Add a photo"}
				className="items-center justify-center overflow-hidden rounded-full bg-surface-secondary"
				disabled={uploading}
				haptic={playSoftPress}
				onPress={onPick}
				style={{ height: PHOTO, width: PHOTO }}
			>
				{uploading ? (
					<ActivityIndicator color={muted} />
				) : photoUrl ? (
					<Image
						className="size-full"
						contentFit="cover"
						source={{ uri: photoUrl }}
					/>
				) : (
					<Icon color={muted} name={CAMERA} size={26} />
				)}
			</PressScale>
			<AppText
				className="pt-3"
				color="accent"
				variant="callout"
				weight="semibold"
			>
				{photoUrl ? "Choose a different photo" : "Choose a photo"}
			</AppText>
			<Footnote className="text-center">
				This is the only image anyone sees. It stays on your Xolacer profile and
				nowhere else.
			</Footnote>
			<Footnote className="pt-1 text-center">
				A new photo replaces the old one straight away.
			</Footnote>
		</View>
	);
}

/** Display name: one line in a settings card. */
export function NameCard({
	value,
	onChange,
}: {
	value: string;
	onChange: (next: string) => void;
}) {
	return (
		<View className="mt-section">
			<SectionTitle>Display name</SectionTitle>
			<SettingsCard>
				<TextInput
					accessibilityLabel="Display name"
					autoCapitalize="words"
					autoCorrect={false}
					className={cn("min-h-13 px-4 py-3 text-foreground", LABEL)}
					maxLength={NAME_MAX_LENGTH}
					onChangeText={onChange}
					placeholder="Maya"
					placeholderTextColorClassName="accent-subtle"
					returnKeyType="done"
					selectionColorClassName="accent-accent"
					value={value}
				/>
			</SettingsCard>
			<Footnote>
				Your real name is never shown — only what you type here.
			</Footnote>
		</View>
	);
}

/** The bio, with its character count under the card. */
export function BioCard({
	value,
	onChange,
}: {
	value: string;
	onChange: (next: string) => void;
}) {
	const near = BIO_MAX_LENGTH - value.length <= BIO_WARN_AT;
	return (
		<View className="mt-section">
			<SectionTitle>Bio</SectionTitle>
			<SettingsCard>
				<TextInput
					accessibilityLabel="Bio"
					className={cn("min-h-26 px-4 py-3 text-foreground", LABEL)}
					maxLength={BIO_MAX_LENGTH}
					multiline
					numberOfLines={BIO_LINES}
					onChangeText={onChange}
					placeholder="Here for the nights that feel too loud. I don't scare easy, and I won't try to fix you."
					placeholderTextColorClassName="accent-subtle"
					selectionColorClassName="accent-accent"
					textAlignVertical="top"
					value={value}
				/>
			</SettingsCard>
			<Footnote className={cn("text-right", near && "text-warning")}>
				{value.length} / {BIO_MAX_LENGTH}
			</Footnote>
		</View>
	);
}
