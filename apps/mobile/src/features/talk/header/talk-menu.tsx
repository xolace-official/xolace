import MoreVert from "@expo/material-symbols/more_vert.xml";
import {
	DropdownMenu,
	DropdownMenuItem,
	Icon,
	IconButton,
	Text,
} from "@expo/ui/jetpack-compose";
import { useState } from "react";
import { GlassGroup } from "@/components/shared/glass-group";
import { ThemedHost } from "@/components/shared/themed-host";
import { useTokenColor } from "@/lib/use-token-color";
import { LAYOUT } from "../motion/talk-motion";
import { type TalkMenuProps, talkMenu } from "./talk-menu-items";

/**
 * Android: the ⋯ menu as a Material 3 dropdown from a glass circle. iOS draws SwiftUI's
 * (`talk-menu.ios.tsx`).
 */
export function TalkMenu(props: TalkMenuProps) {
	const [open, setOpen] = useState(false);
	const foreground = useTokenColor("foreground");
	const { title, items } = talkMenu(props);
	const choose = (onPress: () => void) => {
		setOpen(false);
		onPress();
	};
	return (
		<GlassGroup
			className="absolute p-0"
			style={{ right: LAYOUT.gutter, top: props.top }}
		>
			<ThemedHost matchContents>
				<DropdownMenu expanded={open} onDismissRequest={() => setOpen(false)}>
					<DropdownMenu.Trigger>
						<IconButton onClick={() => setOpen(true)}>
							<Icon source={MoreVert} tint={foreground} />
						</IconButton>
					</DropdownMenu.Trigger>
					<DropdownMenu.Items>
						<DropdownMenuItem enabled={false}>
							<DropdownMenuItem.Text>
								<Text>{title}</Text>
							</DropdownMenuItem.Text>
						</DropdownMenuItem>
						{items.map((item) => (
							<DropdownMenuItem
								enabled={item.enabled}
								key={item.key}
								onClick={() => choose(item.onPress)}
							>
								<DropdownMenuItem.Text>
									<Text>{item.label}</Text>
								</DropdownMenuItem.Text>
								{item.subtitle ? (
									<DropdownMenuItem.SupportingText>
										<Text>{item.subtitle}</Text>
									</DropdownMenuItem.SupportingText>
								) : null}
							</DropdownMenuItem>
						))}
					</DropdownMenu.Items>
				</DropdownMenu>
			</ThemedHost>
		</GlassGroup>
	);
}
