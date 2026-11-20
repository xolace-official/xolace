import type { IconName } from "@/components/shared/icon";
import type { Domain } from "@/features/you/steadiness/steadiness-model";

export const DOMAIN_ICON: Record<Domain, IconName> = {
	belonging: { android: "groups", ios: "person.3.fill" },
	family: {
		android: "family_restroom",
		ios: "figure.2.and.child.holdinghands",
	},
	health: { android: "bedtime", ios: "bed.double.fill" },
	love: { android: "favorite", ios: "heart.fill" },
	money: { android: "home", ios: "house.fill" },
	purpose: { android: "auto_awesome", ios: "sparkles" },
	self: { android: "person", ios: "person.fill" },
	work: { android: "work", ios: "briefcase.fill" },
};
