import { View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useLetterInk } from "../letter-paper";

const W = 22;
const H = 16;

/** The card's mark (board 01): a small envelope with an ember seal, on the ember wash. */
export function LettersMark() {
	const ink = useLetterInk();
	return (
		<View
			accessible={false}
			className="size-10 items-center justify-center rounded-full bg-ember-wash"
		>
			<Svg height={H} viewBox={`0 0 ${W} ${H}`} width={W}>
				<Rect
					fill={ink.paper}
					height={13}
					rx={2}
					stroke={ink.markEdge}
					width={20}
					x={1}
					y={1.5}
				/>
				<Path d="M1.5 3l9.5 6 9.5-6" fill="none" stroke={ink.markEdge} />
				<Circle cx={11} cy={9} fill={ink.emberMid} r={2.6} />
			</Svg>
		</View>
	);
}
