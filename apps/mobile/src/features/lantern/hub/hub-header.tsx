import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { CoverImage } from "@/components/shared/cover-image";
import { LinearGradient } from "@/components/shared/styled";
import { HUB_WASH } from "@/features/lantern/cover-palette";
import type { HubView } from "@/features/lantern/hub/hub-data";
import { hubDetailCount } from "@/features/lantern/lantern-model";
import { LS } from "@/features/lantern/lantern-style";

const COVER = { height: LS.hubCover, width: "100%" } as const;

/** The cover under the bar (a 28% wash for the status bar), then the title, intro and count. */
export function HubHeader({ hub }: { hub: HubView | null | undefined }) {
	return (
		<>
			<View
				accessibilityElementsHidden
				className="bg-surface-secondary"
				importantForAccessibility="no-hide-descendants"
				style={COVER}
			>
				{hub ? (
					<CoverImage
						style={COVER}
						thumbhash={hub.coverThumbhash}
						transition={200}
						uri={hub.coverUrl}
					/>
				) : null}
				<LinearGradient
					className="absolute inset-0"
					colors={HUB_WASH.colors}
					locations={HUB_WASH.locations}
				/>
			</View>
			{hub ? (
				<View
					className="gap-2 pt-5 pb-2"
					style={{ paddingHorizontal: LS.gutter }}
				>
					<AppText
						accessibilityRole="header"
						className="text-[30px] leading-[34.5px] tracking-[-0.9px]"
						variant="display"
					>
						{hub.title}
					</AppText>
					<AppText
						className="text-[16px] leading-[22.4px]"
						color="muted"
						variant="subhead"
					>
						{hub.intro}
					</AppText>
					<AppText
						className="text-[13px] leading-[17px]"
						color="accent"
						variant="footnote"
						weight="semibold"
					>
						{hubDetailCount(hub.items)}
					</AppText>
				</View>
			) : null}
		</>
	);
}
