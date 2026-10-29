"use client";

import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@xolace/ui/components/input-group";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { type ComponentProps, useState } from "react";

/** A password field with a show/hide toggle. Takes the same props as an input. */
export function PasswordInput(
	props: Omit<ComponentProps<typeof InputGroupInput>, "type">
) {
	const [visible, setVisible] = useState(false);

	return (
		<InputGroup>
			<InputGroupInput {...props} type={visible ? "text" : "password"} />
			<InputGroupAddon align="inline-end">
				<InputGroupButton
					aria-label={visible ? "Hide password" : "Show password"}
					aria-pressed={visible}
					onClick={() => setVisible((shown) => !shown)}
					size="icon-sm"
				>
					{visible ? <EyeOffIcon /> : <EyeIcon />}
				</InputGroupButton>
			</InputGroupAddon>
		</InputGroup>
	);
}
