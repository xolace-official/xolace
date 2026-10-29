import { ImageHeader } from "./image-header";
import { PosterHeader } from "./poster-header";

// Which masthead discovery renders; flipped in code, deliberately no UI switch.
const HEADER_VARIANT: "poster" | "image" = "poster";

export function DiscoveryHeader() {
	return HEADER_VARIANT === "poster" ? <PosterHeader /> : <ImageHeader />;
}
