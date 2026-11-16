/**
 * The screen's fixture adapter: the same `{ state, actions }` as `useBadges`,
 * from fixtures. Pins live for the visit, so the pin mark and the fourth-pin
 * refusal (its toast) show as they do live; Share and the freeze buy do nothing.
 * Never reaches the backend.
 */
import { useState } from "react";
import { toast } from "@/components/shared/toast";
import type { Badges } from "@/features/achievements/badges/badges-data";
import {
	badgesView,
	freezeView,
	PIN_LIMIT,
} from "@/features/achievements/badges/badges-model";
import { COPY } from "@/features/achievements/copy";
import { fixtureArt } from "@/features/achievements/dev/fixture-art";
import { OVERVIEW, SHELF } from "@/features/achievements/dev/fixtures";
import { playErrorNotice, playSoftPress } from "@/lib/haptics";

const WARN_AFTER_MS = 120;
const ignore = () => undefined;

export function useFixtureBadges(): Badges {
	const [pins, setPins] = useState(() =>
		OVERVIEW.categories
			.flatMap((c) => c.achievements)
			.filter((a) => a.pinned)
			.map((a) => a.achievementId)
	);
	const view = badgesView({
		...OVERVIEW,
		categories: OVERVIEW.categories.map((c) => ({
			...c,
			achievements: c.achievements.map((a) => ({
				...a,
				pinned: pins.includes(a.achievementId),
			})),
		})),
	});
	for (const b of view.byId.values()) {
		b.art = { ...b.art, source: fixtureArt(b.id) };
	}
	if (view.sparks.latest) {
		view.sparks.latest = view.byId.get(view.sparks.latest.id) ?? null;
	}

	const togglePin = (id: string) => {
		playSoftPress();
		if (pins.includes(id)) {
			setPins(pins.filter((p) => p !== id));
		} else if (pins.length >= PIN_LIMIT) {
			toast(COPY.pins.limit, {
				haptic: () => setTimeout(playErrorNotice, WARN_AFTER_MS),
				variant: "warning",
			});
		} else {
			setPins([...pins, id]);
		}
	};

	return {
		actions: {
			buyFreeze: ignore,
			missing: ignore,
			share: ignore,
			togglePin: (b) => togglePin(b.id),
		},
		state: { buying: false, freeze: freezeView(SHELF), view },
	};
}
