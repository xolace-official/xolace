import {
	Button,
	Menu,
	Section,
	Image as SwiftImage,
	Text,
} from "@expo/ui/swift-ui";
import {
	accessibilityLabel,
	disabled,
	frame,
} from "@expo/ui/swift-ui/modifiers";
import { GlassGroup } from "@/components/shared/glass-group";
import { ThemedHost } from "@/components/shared/themed-host";
import { useTokenColor } from "@/lib/use-token-color";
import { TALK_COPY } from "../copy";
import { LAYOUT } from "../motion/talk-motion";
import { type TalkMenuProps, talkMenu } from "./talk-menu-items";

const GLYPH = 17;

export function TalkMenu(props: TalkMenuProps) {
	const foreground = useTokenColor("foreground");
	const { title, items } = talkMenu(props);
	return (
		<GlassGroup
			className="absolute p-0"
			style={{ right: LAYOUT.gutter, top: props.top }}
		>
			<ThemedHost matchContents>
				<Menu
					label={
						<SwiftImage
							color={foreground}
							modifiers={[
								frame({ height: LAYOUT.button, width: LAYOUT.button }),
								accessibilityLabel(TALK_COPY.start.options),
							]}
							size={GLYPH}
							systemName="ellipsis"
						/>
					}
				>
					<Section title={title}>
						{items.map((item) =>
							item.subtitle ? (
								// SwiftUI's menu reads `Button { Text; Text; Image }` as title, subtitle, icon.
								<Button
									key={item.key}
									modifiers={[disabled(!item.enabled)]}
									onPress={item.onPress}
								>
									<Text>{item.label}</Text>
									<Text>{item.subtitle}</Text>
									<SwiftImage systemName={item.symbol} />
								</Button>
							) : (
								<Button
									key={item.key}
									label={item.label}
									modifiers={[disabled(!item.enabled)]}
									onPress={item.onPress}
									systemImage={item.symbol}
								/>
							)
						)}
					</Section>
				</Menu>
			</ThemedHost>
		</GlassGroup>
	);
}
