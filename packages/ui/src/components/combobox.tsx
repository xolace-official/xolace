"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@xolace/ui/components/input-group";
import { cn } from "@xolace/ui/lib/utils";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";

// shadcn combobox (base-lyra), restyled: the input is our sunken well, the popup and
// items match `select`. The chips variant is left out; `tags-input` covers that.

const Combobox = ComboboxPrimitive.Root;

function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
	return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

function ComboboxTrigger({
	className,
	children,
	...props
}: ComboboxPrimitive.Trigger.Props) {
	return (
		<ComboboxPrimitive.Trigger
			className={cn("[&_svg:not([class*='size-'])]:size-4", className)}
			data-slot="combobox-trigger"
			{...props}
		>
			{children}
			<ChevronDownIcon className="pointer-events-none size-4 stroke-[2.5] text-ink-muted" />
		</ComboboxPrimitive.Trigger>
	);
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
	return (
		<ComboboxPrimitive.Clear
			className={cn(className)}
			data-slot="combobox-clear"
			render={<InputGroupButton size="icon-xs" variant="ghost" />}
			{...props}
		>
			<XIcon className="pointer-events-none" />
		</ComboboxPrimitive.Clear>
	);
}

function ComboboxInput({
	className,
	children,
	disabled = false,
	showTrigger = true,
	showClear = false,
	...props
}: ComboboxPrimitive.Input.Props & {
	showTrigger?: boolean;
	showClear?: boolean;
}) {
	return (
		<InputGroup className={cn("w-auto", className)}>
			<ComboboxPrimitive.Input
				render={<InputGroupInput disabled={disabled} />}
				{...props}
			/>
			<InputGroupAddon align="inline-end">
				{showTrigger ? (
					<InputGroupButton
						className="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
						data-slot="input-group-button"
						disabled={disabled}
						render={<ComboboxTrigger />}
						size="icon-xs"
						variant="ghost"
					/>
				) : null}
				{showClear ? <ComboboxClear disabled={disabled} /> : null}
			</InputGroupAddon>
			{children}
		</InputGroup>
	);
}

function ComboboxContent({
	className,
	side = "bottom",
	sideOffset = 6,
	align = "start",
	alignOffset = 0,
	anchor,
	...props
}: ComboboxPrimitive.Popup.Props &
	Pick<
		ComboboxPrimitive.Positioner.Props,
		"side" | "align" | "sideOffset" | "alignOffset" | "anchor"
	>) {
	return (
		<ComboboxPrimitive.Portal>
			<ComboboxPrimitive.Positioner
				align={align}
				alignOffset={alignOffset}
				anchor={anchor}
				className="isolate z-50"
				side={side}
				sideOffset={sideOffset}
			>
				<ComboboxPrimitive.Popup
					className={cn(
						"group/combobox-content data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95 relative max-h-(--available-height) w-(--anchor-width) min-w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) overflow-hidden rounded-lg border-2 border-line bg-popover p-1.5 text-popover-foreground shadow-[0_var(--depth-md)_0_var(--line-strong)] duration-100 data-closed:animate-out data-open:animate-in",
						className
					)}
					data-slot="combobox-content"
					{...props}
				/>
			</ComboboxPrimitive.Positioner>
		</ComboboxPrimitive.Portal>
	);
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
	return (
		<ComboboxPrimitive.List
			className={cn(
				"max-h-[min(--spacing(80),calc(var(--available-height)---spacing(4)))] scroll-py-1 overflow-y-auto overscroll-contain data-empty:p-0",
				className
			)}
			data-slot="combobox-list"
			{...props}
		/>
	);
}

function ComboboxItem({
	className,
	children,
	...props
}: ComboboxPrimitive.Item.Props) {
	return (
		<ComboboxPrimitive.Item
			className={cn(
				"type-body relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-2 pr-8 pl-2.5 outline-hidden data-disabled:pointer-events-none data-highlighted:bg-accent data-selected:font-semibold data-highlighted:text-accent-foreground data-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className
			)}
			data-slot="combobox-item"
			{...props}
		>
			{children}
			<ComboboxPrimitive.ItemIndicator
				render={
					<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
				}
			>
				<CheckIcon className="pointer-events-none" />
			</ComboboxPrimitive.ItemIndicator>
		</ComboboxPrimitive.Item>
	);
}

function ComboboxGroup({ className, ...props }: ComboboxPrimitive.Group.Props) {
	return (
		<ComboboxPrimitive.Group
			className={cn(className)}
			data-slot="combobox-group"
			{...props}
		/>
	);
}

function ComboboxLabel({
	className,
	...props
}: ComboboxPrimitive.GroupLabel.Props) {
	return (
		<ComboboxPrimitive.GroupLabel
			className={cn("type-eyebrow px-2 py-2 text-ink-muted", className)}
			data-slot="combobox-label"
			{...props}
		/>
	);
}

function ComboboxCollection({ ...props }: ComboboxPrimitive.Collection.Props) {
	return (
		<ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />
	);
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
	return (
		<ComboboxPrimitive.Empty
			className={cn(
				"type-small hidden w-full justify-center py-3 text-center text-ink-muted group-data-empty/combobox-content:flex",
				className
			)}
			data-slot="combobox-empty"
			{...props}
		/>
	);
}

function ComboboxSeparator({
	className,
	...props
}: ComboboxPrimitive.Separator.Props) {
	return (
		<ComboboxPrimitive.Separator
			className={cn("-mx-1.5 my-1.5 h-0.5 bg-line", className)}
			data-slot="combobox-separator"
			{...props}
		/>
	);
}

export {
	Combobox,
	ComboboxClear,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxInput,
	ComboboxItem,
	ComboboxLabel,
	ComboboxList,
	ComboboxSeparator,
	ComboboxTrigger,
	ComboboxValue,
};
