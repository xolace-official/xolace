import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { SocialId } from "@/features/settings/follow/copy";
import { useTokenColor } from "@/lib/use-token-color";

/**
 * The boards' one-colour marks for Follow Xolace (`.g-web` … `.g-whatsapp`): line drawings in the
 * accent, never the brands' full-colour logos. Decorative: the row says the name.
 */
const SIZE = 16;
const DOT = 0.6;

export function SocialMark({ id }: { id: SocialId }) {
	const color = useTokenColor("accent");
	const stroke = {
		fill: "none",
		stroke: color,
		strokeLinecap: "round",
		strokeLinejoin: "round",
		strokeWidth: 2,
	} as const;
	return (
		<Svg
			accessibilityElementsHidden
			height={SIZE}
			importantForAccessibility="no-hide-descendants"
			viewBox="0 0 24 24"
			width={SIZE}
		>
			{id === "web" ? (
				<>
					<Circle cx={12} cy={12} r={8.5} {...stroke} />
					<Path
						d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5s1.1-6.1 3.4-8.5z"
						{...stroke}
					/>
				</>
			) : null}
			{id === "instagram" ? (
				<>
					<Rect height={16} rx={4.8} width={16} x={4} y={4} {...stroke} />
					<Circle cx={12} cy={12} r={3.7} {...stroke} />
					<Circle cx={16.9} cy={7.1} fill={color} r={DOT} />
				</>
			) : null}
			{id === "tiktok" ? (
				<Path
					d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5M14 4c.4 2.4 2 4 4.5 4.3"
					{...stroke}
				/>
			) : null}
			{id === "linkedin" ? (
				<>
					<Rect height={16} rx={3} width={16} x={4} y={4} {...stroke} />
					<Path
						d="M8.5 10.5V16M8.5 7.8v.1M11.8 16v-5.5M11.8 13c0-1.6 1-2.6 2.3-2.6s2 .9 2 2.6V16"
						{...stroke}
					/>
				</>
			) : null}
			{id === "snapchat" ? (
				<Path
					d="M12 4c2.7 0 4.3 2 4.3 4.6v2.1l1.7-.4c.4.6.1 1.1-1.2 1.6.3 1.8 1.7 3.1 3.2 3.6-.3.8-1.4.9-2.4 1.1-.2.6-.2 1.1-.8 1.1-.9 0-1.8-.4-2.9.6-.9.7-1.9.8-2 .8s-1.1-.1-2-.8c-1.1-1-2-.6-2.9-.6-.6 0-.6-.5-.8-1.1-1-.2-2.1-.3-2.4-1.1 1.5-.5 2.9-1.8 3.2-3.6-1.3-.5-1.6-1-1.2-1.6l1.7.4V8.6C7.7 6 9.3 4 12 4z"
					{...stroke}
				/>
			) : null}
			{id === "whatsapp" ? (
				<>
					<Path d="M4.5 19.5l1.2-3.6A7.8 7.8 0 1 1 8.6 18.6z" {...stroke} />
					<Path
						d="M9.3 8.7c.2-.4.6-.4.9-.2l.8 1.6c.1.3 0 .5-.2.7l-.4.4c.5 1 1.3 1.8 2.3 2.3l.4-.4c.2-.2.5-.3.7-.2l1.6.8c.3.2.3.6.1.9-.5.8-1.4 1.2-2.4.9-2-.7-3.6-2.3-4.3-4.3-.2-.9.1-1.8.5-2.5z"
						{...stroke}
					/>
				</>
			) : null}
		</Svg>
	);
}
