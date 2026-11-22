import { HOME_S } from "@/features/explore/explore-style";
import { isWide, rowTile, type Screen } from "@/lib/wide-layout";

/** Featured's width over height on wide screens, where the phone's fixed height would crop the art to a strip. */
const FEATURED_WIDE_ASPECT = 2;

/** The featured card: full width between the gutters; on wide screens tall enough to keep the art readable. */
export function featuredSize(screen: Screen): { w: number; h: number } {
	const w = screen.width - HOME_S.gutter * 2;
	const phone = HOME_S.feat.h;
	return {
		h: isWide(screen)
			? Math.max(phone, Math.round(w / FEATURED_WIDE_ASPECT))
			: phone,
		w,
	};
}

/** A shelf tile's art edge: the phone size, grown on wide screens so the row fills. */
export function tileArt(screen: Screen): number {
	return rowTile(screen, {
		gap: HOME_S.shelfGap,
		row: screen.width - HOME_S.gutter * 2,
		size: HOME_S.tile.art,
	});
}
