import { View } from "react-native";
import { Avatar } from "@/components/shared/avatar";
import { Icon } from "@/components/shared/icon";
import { Image, LinearGradient } from "@/components/shared/styled";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";
import { useConnectColors } from "../connect-colors";

const FLAME_START = { x: 0.3, y: 0.2 };
const FLAME_END = { x: 0.9, y: 1 };
const FLAME_GLYPH = 0.42;
const PRESENCE_DOT = 0.27;
const MIN_DOT = 11;
const FLAME = { android: "local_fire_department", ios: "flame.fill" } as const;

const initialOf = (name: string) =>
	name.trim().charAt(0).toLocaleUpperCase() || "?";

export function XolacerAvatar({
	id,
	name,
	photoUrl,
	size = 48,
	online,
	muted,
}: {
	id: string;
	name: string;
	photoUrl?: string;
	size?: number;
	online?: boolean;
	muted?: boolean;
}) {
	const { art } = useConnectColors();
	const dot = Math.max(MIN_DOT, size * PRESENCE_DOT);
	return (
		<View
			accessibilityElementsHidden
			className={cn(muted && "opacity-50")}
			importantForAccessibility="no-hide-descendants"
			style={{ height: size, width: size }}
		>
			{photoUrl ? (
				<>
					<Image
						className="rounded-full bg-surface-secondary"
						contentFit="cover"
						source={{ uri: photoUrl }}
						style={{ height: size, width: size }}
					/>
					{online ? (
						<View
							className="absolute right-0 bottom-0 rounded-full border-[2.5px] border-background bg-success"
							style={{ height: dot, width: dot }}
						/>
					) : null}
				</>
			) : (
				<Avatar
					art={art(id)}
					initial={initialOf(name)}
					online={online}
					size={size}
				/>
			)}
		</View>
	);
}

export function XolaceMark({ size = 48 }: { size?: number }) {
	const { flame } = useConnectColors();
	const onArt = useTokenColor("on-art");
	return (
		<LinearGradient
			accessibilityElementsHidden
			className="items-center justify-center rounded-full"
			colors={flame}
			end={FLAME_END}
			importantForAccessibility="no-hide-descendants"
			start={FLAME_START}
			style={{ height: size, width: size }}
		>
			<Icon color={onArt} name={FLAME} size={size * FLAME_GLYPH} />
		</LinearGradient>
	);
}
