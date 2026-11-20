import {
	ClipOp,
	ImageFormat,
	PaintStyle,
	type SkImage,
	Skia,
} from "@shopify/react-native-skia";

const ICON = 30;
const SCALE = 3;
const PLAIN_INSET = 1;
const RINGED_INSET = 3;
const RING = 1.5;
const PNG_QUALITY = 100;

export type TabIconSource = {
	uri: string;
	width: number;
	height: number;
	scale: number;
};

function draw(art: SkImage, ring: string | null): string | null {
	const px = ICON * SCALE;
	const surface = Skia.Surface.MakeOffscreen(px, px);
	if (!surface) {
		return null;
	}
	const canvas = surface.getCanvas();
	const inset = (ring ? RINGED_INSET : PLAIN_INSET) * SCALE;
	const d = px - inset * 2;
	canvas.save();
	canvas.clipPath(
		Skia.PathBuilder.Make()
			.addCircle(px / 2, px / 2, d / 2)
			.build(),
		ClipOp.Intersect,
		true
	);
	const side = Math.min(art.width(), art.height());
	canvas.drawImageRect(
		art,
		Skia.XYWHRect(
			(art.width() - side) / 2,
			(art.height() - side) / 2,
			side,
			side
		),
		Skia.XYWHRect(inset, inset, d, d),
		Skia.Paint()
	);
	canvas.restore();
	if (ring) {
		const paint = Skia.Paint();
		paint.setStyle(PaintStyle.Stroke);
		paint.setStrokeWidth(RING * SCALE);
		paint.setAntiAlias(true);
		paint.setColor(Skia.Color(ring));
		canvas.drawCircle(px / 2, px / 2, (px - RING * SCALE) / 2, paint);
	}
	surface.flush();
	const png = surface
		.makeImageSnapshot()
		.encodeToBase64(ImageFormat.PNG, PNG_QUALITY);
	return `data:image/png;base64,${png}`;
}

const source = (uri: string): TabIconSource => ({
	height: ICON,
	scale: SCALE,
	uri,
	width: ICON,
});

export async function avatarTabIcons(
	url: string,
	ring: string
): Promise<{ plain: TabIconSource; selected: TabIconSource } | null> {
	const data = await Skia.Data.fromURI(url);
	const art = Skia.Image.MakeImageFromEncoded(data);
	if (!art) {
		return null;
	}
	const plain = draw(art, null);
	const selected = draw(art, ring);
	return plain && selected
		? { plain: source(plain), selected: source(selected) }
		: null;
}
