import {
	DropdownMenu,
	DropdownMenuItem,
	FilledTonalButton,
	Text,
} from "@expo/ui/jetpack-compose";
import { useState } from "react";
import { Presets } from "react-native-pulsar";
import { type ChoiceProps, labelOf } from "@/components/shared/choice-props";
import { ThemedHost } from "@/components/shared/themed-host";

export function CountryMenu<T extends string>({
	options,
	value,
	onChange,
}: ChoiceProps<T>) {
	const [open, setOpen] = useState(false);
	return (
		<ThemedHost matchContents>
			<DropdownMenu expanded={open} onDismissRequest={() => setOpen(false)}>
				<DropdownMenu.Trigger>
					<FilledTonalButton onClick={() => setOpen(true)}>
						<Text>{`${labelOf(options, value)} ▾`}</Text>
					</FilledTonalButton>
				</DropdownMenu.Trigger>
				<DropdownMenu.Items>
					{options.map((o) => (
						<DropdownMenuItem
							key={o.id}
							onClick={() => {
								Presets.System.selection();
								setOpen(false);
								onChange(o.id);
							}}
						>
							<DropdownMenuItem.Text>
								<Text>{o.id === value ? `✓ ${o.label}` : o.label}</Text>
							</DropdownMenuItem.Text>
						</DropdownMenuItem>
					))}
				</DropdownMenu.Items>
			</DropdownMenu>
		</ThemedHost>
	);
}
