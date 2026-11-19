import { View } from "react-native";
import { FoldedLetter } from "../folded-letter";

/** The session end's next card draws its art in a 44 pt tile, corner 14 (its `LAYOUT.next`). */
const TILE = 44;
const TILE_RADIUS = 14;
const LETTER_TOP = 13;

/**
 * Both session-end cards' tile (board `.nxi`, renders 29–30): the folded letter with its ember
 * seal, on the ember wash. Drawn here, composed in by the session end's route.
 */
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
