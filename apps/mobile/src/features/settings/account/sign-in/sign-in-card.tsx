import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SectionTitle, SettingsCard } from "@/components/settings-kit/parts";
import { ROW } from "@/components/settings-kit/settings-layout";
import { TileRow } from "@/components/settings-kit/tile-row";
import { useAccountScreen } from "@/features/settings/account/account-data";
import {
	ACCOUNT_COPY as C,
	ACCOUNT_ICONS as I,
} from "@/features/settings/account/copy";
import { useTokenColor, useTokenColors } from "@/lib/use-token-color";

const MARK = 16;

function GoogleMark() {
	const [blue, green, yellow, red] = useTokenColors([
		"account-google-blue",
		"account-google-green",
		"account-google-yellow",
		"account-google-red",
	]);
	return (
		<Svg height={MARK} viewBox="0 0 24 24" width={MARK}>
			<Path
				d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"
				fill={blue}
			/>
			<Path
				d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"
				fill={green}
			/>
			<Path
				d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z"
				fill={yellow}
			/>
			<Path
				d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6z"
				fill={red}
			/>
		</Svg>
	);
}

function AppleMark() {
	const ink = useTokenColor("foreground");
	return (
		<Svg height={MARK} viewBox="0 0 24 24" width={MARK}>
			<Path
				d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.23 0-1.44.64-2.2.46-3.06-.4C3.79 16.16 4.36 9.52 8.77 9.28c1.25.07 2.12.72 2.88.77.92-.19 1.8-.86 2.79-.78 1.18.1 2.07.58 2.65 1.49-2.42 1.45-1.85 4.62.43 5.51-.51 1.34-1.17 2.66-2.47 4.01zM12.03 9.21C11.88 7.09 13.6 5.34 15.6 5.17c.29 2.41-2.19 4.21-3.57 4.04z"
				fill={ink}
			/>
		</Svg>
	);
}

export function SignInCard() {
	const { signIn } = useAccountScreen().state;
	let row = (
		<View accessibilityLabel={C.signInLoading} accessible className={ROW} />
	);
	if (signIn === "apple") {
		row = (
			<TileRow
				label={C.signedIn.apple}
				last
				mark={<AppleMark />}
				tile="neutral"
			/>
		);
	} else if (signIn === "google") {
		row = (
			<TileRow
				label={C.signedIn.google}
				last
				mark={<GoogleMark />}
				tile="neutral"
			/>
		);
	} else if (signIn === "email") {
		row = <TileRow icon={I.email} label={C.signedIn.email} last />;
	}
	return (
		<View>
			<SectionTitle>{C.signIn}</SectionTitle>
			<SettingsCard>{row}</SettingsCard>
		</View>
	);
}
