import { View } from "react-native";
import { FoldedLetter } from "../folded-letter";

const TILE = 44;
const TILE_RADIUS = 14;
const LETTER_TOP = 13;

export function LetterTile() {
	return (
		<View
			className="items-center bg-ember-wash"
			style={{
				borderRadius: TILE_RADIUS,
				height: TILE,
				paddingTop: LETTER_TOP,
				width: TILE,
			}}
		>
			<FoldedLetter size="tile" />
		</View>
	);
}
