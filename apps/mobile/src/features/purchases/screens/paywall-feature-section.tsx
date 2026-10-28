import { Separator, Surface } from "heroui-native";
import type { ReactElement } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import type { PaywallFeatureId } from "./paywall-surface-map";

type Props = {
	title: string;
	children: ReactElement<{ id: PaywallFeatureId }>[];
};

/** One titled group of feature rows inside the paywall. */
export function PaywallFeatureSection({ title, children }: Props) {
	return (
		<View className="gap-3">
			<AppText className="text-center font-semibold text-foreground text-lg">
				{title}
			</AppText>
			<Surface className="gap-4" variant="secondary">
				{children.map((child, index) => (
					<View key={child.props.id}>
						{index > 0 && <Separator className="mb-4" />}
						{child}
					</View>
				))}
			</Surface>
		</View>
	);
}
