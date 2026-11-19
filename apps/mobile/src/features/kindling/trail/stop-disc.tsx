import {
	Canvas,
	Circle,
	ColorMatrix,
	Group,
	Image,
	Paint,
	Skia,
	useImage,
} from "@shopify/react-native-skia";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { isCleanPose, poseOf } from "../poses";
import { CIRCLE, RADIUS } from "./trail-points";

/** The disc's 3 pt ring; a clean Flux sits in the box inside it. */
export const RING = 3;
/** A clean pose's width and its top inside the ring (the board's `.pz-hear`). */
const CLEAN_W = 58;
const CLEAN_TOP = 5;
const CLIP = Skia.PathBuilder.Make().addCircle(RADIUS, RADIUS, RADIUS).build();
const R = 0.2126;
const G = 0.7152;
const B = 0.0722;

/** A saturation matrix (Rec. 709 luma): 1 as drawn, 0 grey. */
function saturate(s: number): number[] {
	"worklet";
	const r = R * (1 - s);
	const g = G * (1 - s);
	const b = B * (1 - s);
	return [
		r + s,
		g,
		b,
		0,
		0,
		r,
		g + s,
		b,
		0,
		0,
		r,
		g,
		b + s,
		0,
		0,
		0,
		0,
		0,
		1,
		0,
	];
}

type Props = {
	kind: string;
	tint: string;
	page: string;
	/** Flux's saturation (1, .55 when later, 0 when passed), its opacity, and the page veil. */
	tone: SharedValue<number>;
	alpha: SharedValue<number>;
	veil: SharedValue<number>;
};

/**
 * The stop's disc: opaque, so the road passing under it never shows through (§2.4). Later twigs
 * dim with a solid page-coloured veil inside the circle, never with transparency (§3).
 */
export function StopDisc({ kind, tint, page, tone, alpha, veil }: Props) {
	const image = useImage(poseOf(kind));
	const matrix = useDerivedValue(() => saturate(tone.get()));
	const clean = isCleanPose(kind);
	const h = image && clean ? (CLEAN_W * image.height()) / image.width() : 0;
	return (
		<Canvas
			pointerEvents="none"
			style={{
				height: CIRCLE,
				left: 0,
				position: "absolute",
				top: 0,
				width: CIRCLE,
			}}
		>
			<Group clip={CLIP}>
				<Circle color={tint} cx={RADIUS} cy={RADIUS} r={RADIUS} />
				{image ? (
					<Group
						layer={
							<Paint>
								<ColorMatrix matrix={matrix} />
							</Paint>
						}
						opacity={alpha}
					>
						{clean ? (
							<Image
								fit="contain"
								height={h}
								image={image}
								width={CLEAN_W}
								x={RADIUS - CLEAN_W / 2}
								y={RING + CLEAN_TOP}
							/>
						) : (
							<Image
								fit="cover"
								height={CIRCLE}
								image={image}
								width={CIRCLE}
								x={0}
								y={0}
							/>
						)}
					</Group>
				) : null}
				<Circle
					color={page}
					cx={RADIUS}
					cy={RADIUS}
					opacity={veil}
					r={RADIUS}
				/>
			</Group>
		</Canvas>
	);
}
