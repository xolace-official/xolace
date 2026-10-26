"use client";

import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@xolace/ui/components/field";
import { Input } from "@xolace/ui/components/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@xolace/ui/components/input-group";
import { Switch } from "@xolace/ui/components/switch";
import { Textarea } from "@xolace/ui/components/textarea";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@xolace/ui/components/toggle-group";

import { PERMISSION_LABEL, SOURCE_PERMISSIONS } from "../types";
import { useSourceEditor } from "./source-editor-provider";

/** Who the publisher is and how every entry credits them. */
export function SourceCreditFields() {
	const {
		state: { source },
		actions: { setField },
		meta: { errors },
	} = useSourceEditor();

	return (
		<FieldGroup>
			<Field data-invalid={errors.name ? true : undefined}>
				<FieldLabel htmlFor="source-name">Publisher</FieldLabel>
				<Input
					aria-invalid={errors.name ? true : undefined}
					id="source-name"
					onChange={(event) => setField("name", event.target.value)}
					value={source.name}
				/>
				<FieldError>{errors.name}</FieldError>
			</Field>
			<Field>
				<FieldLabel htmlFor="source-url">Website</FieldLabel>
				<Input
					id="source-url"
					onChange={(event) => setField("url", event.target.value || undefined)}
					placeholder="https://"
					type="url"
					value={source.url ?? ""}
				/>
			</Field>
			<Field data-invalid={errors.attributionText ? true : undefined}>
				<FieldLabel htmlFor="source-attribution">Credit line</FieldLabel>
				<Textarea
					aria-invalid={errors.attributionText ? true : undefined}
					className="min-h-20"
					id="source-attribution"
					onChange={(event) => setField("attributionText", event.target.value)}
					value={source.attributionText}
				/>
				<FieldDescription>
					Shown under every entry that credits this source.
				</FieldDescription>
				<FieldError>{errors.attributionText}</FieldError>
			</Field>
			<Field orientation="horizontal">
				<Switch
					checked={source.dropBrandingIfAdapted}
					id="source-drop-branding"
					onCheckedChange={(checked) =>
						setField("dropBrandingIfAdapted", checked)
					}
				/>
				<FieldContent>
					<FieldLabel htmlFor="source-drop-branding">
						No logo on adapted entries
					</FieldLabel>
					<FieldDescription>
						When we rewrite their material in our words, credit them by name
						only.
					</FieldDescription>
				</FieldContent>
			</Field>
		</FieldGroup>
	);
}

/** What lets us reuse it, and how often a verbatim copy must be re-checked. */
export function SourceTermsFields() {
	const {
		state: { source },
		actions: { setField },
		meta: { errors },
	} = useSourceEditor();

	return (
		<FieldGroup>
			<Field data-invalid={errors.licence ? true : undefined}>
				<FieldLabel htmlFor="source-licence">Licence</FieldLabel>
				<Input
					aria-invalid={errors.licence ? true : undefined}
					id="source-licence"
					onChange={(event) => setField("licence", event.target.value)}
					placeholder="Open Government Licence v3.0"
					value={source.licence}
				/>
				<FieldError>{errors.licence}</FieldError>
			</Field>
			<Field>
				<FieldLabel>Permission</FieldLabel>
				<ToggleGroup
					aria-label="Permission"
					onValueChange={(value) => {
						const next = SOURCE_PERMISSIONS.find((p) => p === value[0]);
						if (next) {
							setField("permission", next);
						}
					}}
					size="sm"
					value={[source.permission]}
					variant="outline"
				>
					{SOURCE_PERMISSIONS.map((permission) => (
						<ToggleGroupItem key={permission} value={permission}>
							{PERMISSION_LABEL[permission]}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
				<FieldDescription>
					Pending means we asked and are waiting. Don't publish a verbatim entry
					from it until it's granted.
				</FieldDescription>
			</Field>
			<Field>
				<FieldLabel htmlFor="source-refresh">Refresh every</FieldLabel>
				<InputGroup className="w-48">
					<InputGroupInput
						id="source-refresh"
						inputMode="numeric"
						min={1}
						onChange={(event) => {
							const days = Number.parseInt(event.target.value, 10);
							setField("refreshDays", days > 0 ? days : undefined);
						}}
						placeholder="Never"
						type="number"
						value={source.refreshDays ?? ""}
					/>
					<InputGroupAddon align="inline-end">days</InputGroupAddon>
				</InputGroup>
				<FieldDescription>
					For pages we copy word for word: past this, entries citing them get a
					"refresh" warning. Leave empty for paraphrased sources.
				</FieldDescription>
			</Field>
		</FieldGroup>
	);
}
