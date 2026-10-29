import type { FounderCardShape } from "./clip-paths";

// Twilight imagery served from Convex file storage. One card per shape, no duplicates
// (#236). Frame colours are theme tokens, never hex, so the band re-tints with the theme.

export type FounderMarqueeCard = {
	id: string;
	/** Convex serving URL, accepted by both Skia `useImage` and expo-image. */
	image: string;
	/** Uniwind background class for the card frame. */
	frameClassName: string;
	shape: FounderCardShape;
};

export const FOUNDER_MARQUEE_CARDS: FounderMarqueeCard[] = [
	{
		frameClassName: "bg-tone-poetic/70",
		id: "heavy",
		image:
			"https://energetic-guineapig-283.convex.cloud/api/storage/d3e9fa4d-b1d0-4fcd-9ddc-3a734f46b99b",
		shape: "roundedRect",
	},
	{
		frameClassName: "bg-tone-gentle/70",
		id: "anxious",
		image:
			"https://energetic-guineapig-283.convex.cloud/api/storage/f708ad8b-2992-490d-b11b-83ab502f71bb",
		shape: "portal",
	},
	{
		frameClassName: "bg-tone-direct/70",
		id: "numb",
		image:
			"https://energetic-guineapig-283.convex.cloud/api/storage/9f1c0b9e-fed0-4490-bb22-cb954176d7b7",
		shape: "blob",
	},
	{
		frameClassName: "bg-ember/70",
		id: "restless",
		image:
			"https://energetic-guineapig-283.convex.cloud/api/storage/2a14665b-508b-4b51-b7f5-b6a06e1cb192",
		shape: "flower",
	},
	{
		frameClassName: "bg-tone-witnessed/70",
		id: "lost",
		image:
			"https://energetic-guineapig-283.convex.cloud/api/storage/1797fb79-3ffa-4e36-ad6d-db004bc5f0f1",
		shape: "circle",
	},
];
