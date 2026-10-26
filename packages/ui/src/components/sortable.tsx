"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";
import {
	type Announcements,
	closestCenter,
	closestCorners,
	DndContext,
	type DndContextProps,
	type DragEndEvent,
	type DraggableAttributes,
	type DraggableSyntheticListeners,
	DragOverlay,
	type DragStartEvent,
	type DropAnimation,
	defaultDropAnimationSideEffects,
	KeyboardSensor,
	MouseSensor,
	type ScreenReaderInstructions,
	TouchSensor,
	type UniqueIdentifier,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	restrictToHorizontalAxis,
	restrictToParentElement,
	restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
	arrayMove,
	horizontalListSortingStrategy,
	SortableContext,
	type SortableContextProps,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@xolace/ui/lib/utils";
import {
	type ComponentProps,
	type CSSProperties,
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useId,
	useMemo,
	useState,
} from "react";
import { createPortal } from "react-dom";

// A consumer cancels a drag by calling preventDefault() on the activator event in its
// own onDragStart/onDragEnd. dnd-kit's KeyboardSensor already prevents the keydown
// that starts a keyboard drag, so that check alone made keyboard sorting a no-op
// (Xolace change to the diceui source).
function cancelledByHandler(activatorEvent: Event) {
	return (
		activatorEvent.defaultPrevented &&
		!(activatorEvent instanceof KeyboardEvent)
	);
}

const ORIENTATION_KEYS = {
	horizontal: "left and right",
	mixed: "arrow",
	vertical: "up and down",
} as const;

const orientationConfig = {
	horizontal: {
		collisionDetection: closestCenter,
		modifiers: [restrictToHorizontalAxis, restrictToParentElement],
		strategy: horizontalListSortingStrategy,
	},
	mixed: {
		collisionDetection: closestCorners,
		modifiers: [restrictToParentElement],
		strategy: undefined,
	},
	vertical: {
		collisionDetection: closestCenter,
		modifiers: [restrictToVerticalAxis, restrictToParentElement],
		strategy: verticalListSortingStrategy,
	},
};

const ROOT_NAME = "Sortable";
const CONTENT_NAME = "SortableContent";
const ITEM_NAME = "SortableItem";
const ITEM_HANDLE_NAME = "SortableItemHandle";
const OVERLAY_NAME = "SortableOverlay";

interface SortableRootContextValue<T> {
	activeId: UniqueIdentifier | null;
	flatCursor: boolean;
	getItemValue: (item: T) => UniqueIdentifier;
	id: string;
	items: UniqueIdentifier[];
	modifiers: DndContextProps["modifiers"];
	setActiveId: (id: UniqueIdentifier | null) => void;
	strategy: SortableContextProps["strategy"];
}

const SortableRootContext =
	createContext<SortableRootContextValue<unknown> | null>(null);

function useSortableContext(consumerName: string) {
	const context = useContext(SortableRootContext);
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
	}
	return context;
}

interface GetItemValue<T> {
	/**
	 * Callback that returns a unique identifier for each sortable item. Required for array of objects.
	 * @example getItemValue={(item) => item.id}
	 */
	getItemValue: (item: T) => UniqueIdentifier;
}

type SortableProps<T> = DndContextProps &
	(T extends object ? GetItemValue<T> : Partial<GetItemValue<T>>) & {
		value: T[];
		onValueChange?: (items: T[]) => void;
		onMove?: (
			event: DragEndEvent & { activeIndex: number; overIndex: number }
		) => void;
		strategy?: SortableContextProps["strategy"];
		orientation?: "vertical" | "horizontal" | "mixed";
		flatCursor?: boolean;
	};

function Sortable<T>(props: SortableProps<T>) {
	const {
		value,
		onValueChange,
		collisionDetection,
		modifiers,
		strategy,
		onMove,
		orientation = "vertical",
		flatCursor = false,
		getItemValue: getItemValueProp,
		accessibility,
		...sortableProps
	} = props;

	const id = useId();
	const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

	const sensors = useSensors(
		useSensor(MouseSensor),
		useSensor(TouchSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);
	const config = useMemo(() => orientationConfig[orientation], [orientation]);

	const getItemValue = useCallback(
		(item: T): UniqueIdentifier => {
			if (typeof item === "object" && !getItemValueProp) {
				throw new Error(
					"`getItemValue` is required when using array of objects"
				);
			}
			return getItemValueProp
				? getItemValueProp(item)
				: (item as UniqueIdentifier);
		},
		[getItemValueProp]
	);

	const items = useMemo(
		() => value.map((item) => getItemValue(item)),
		[value, getItemValue]
	);

	const onDragStart = useCallback(
		(event: DragStartEvent) => {
			sortableProps.onDragStart?.(event);

			if (cancelledByHandler(event.activatorEvent)) {
				return;
			}

			setActiveId(event.active.id);
		},
		[sortableProps.onDragStart]
	);

	const onDragEnd = useCallback(
		(event: DragEndEvent) => {
			sortableProps.onDragEnd?.(event);

			if (cancelledByHandler(event.activatorEvent)) {
				return;
			}

			const { active, over } = event;
			if (over && active.id !== over?.id) {
				const activeIndex = value.findIndex(
					(item) => getItemValue(item) === active.id
				);
				const overIndex = value.findIndex(
					(item) => getItemValue(item) === over.id
				);

				if (onMove) {
					onMove({ ...event, activeIndex, overIndex });
				} else {
					onValueChange?.(arrayMove(value, activeIndex, overIndex));
				}
			}
			setActiveId(null);
		},
		[value, onValueChange, onMove, getItemValue, sortableProps.onDragEnd]
	);

	const onDragCancel = useCallback(
		(event: DragEndEvent) => {
			sortableProps.onDragCancel?.(event);

			if (cancelledByHandler(event.activatorEvent)) {
				return;
			}

			setActiveId(null);
		},
		[sortableProps.onDragCancel]
	);

	const announcements: Announcements = useMemo(
		() => ({
			onDragCancel({ active }) {
				const activeIndex = active.data.current?.sortable.index ?? 0;
				const activeValue = active.id.toString();
				return `Sorting cancelled. Sortable item "${activeValue}" returned to position ${activeIndex + 1} of ${value.length}.`;
			},
			onDragEnd({ active, over }) {
				const activeValue = active.id.toString();
				if (over) {
					const overIndex = over.data.current?.sortable.index ?? 0;
					return `Sortable item "${activeValue}" dropped at position ${overIndex + 1} of ${value.length}.`;
				}
				return `Sortable item "${activeValue}" dropped. No changes were made.`;
			},
			onDragMove({ active, over }) {
				if (over) {
					const overIndex = over.data.current?.sortable.index ?? 0;
					const activeIndex = active.data.current?.sortable.index ?? 0;
					const moveDirection = overIndex > activeIndex ? "down" : "up";
					const activeValue = active.id.toString();
					return `Sortable item "${activeValue}" is moving ${moveDirection} to position ${overIndex + 1} of ${value.length}.`;
				}
				return "Sortable item is no longer over a droppable area. Press escape to cancel.";
			},
			onDragOver({ active, over }) {
				if (over) {
					const overIndex = over.data.current?.sortable.index ?? 0;
					const activeIndex = active.data.current?.sortable.index ?? 0;
					const moveDirection = overIndex > activeIndex ? "down" : "up";
					const activeValue = active.id.toString();
					return `Sortable item "${activeValue}" moved ${moveDirection} to position ${overIndex + 1} of ${value.length}.`;
				}
				return "Sortable item is no longer over a droppable area. Press escape to cancel.";
			},
			onDragStart({ active }) {
				const activeValue = active.id.toString();
				return `Grabbed sortable item "${activeValue}". Current position is ${active.data.current?.sortable.index + 1} of ${value.length}. Use arrow keys to move, space to drop.`;
			},
		}),
		[value]
	);

	const screenReaderInstructions: ScreenReaderInstructions = useMemo(
		() => ({
			draggable: `
        To pick up a sortable item, press space or enter.
        While dragging, use the ${ORIENTATION_KEYS[orientation]} keys to move the item.
        Press space or enter again to drop the item in its new position, or press escape to cancel.
      `,
		}),
		[orientation]
	);

	const contextValue = useMemo(
		() => ({
			activeId,
			flatCursor,
			getItemValue,
			id,
			items,
			modifiers: modifiers ?? config.modifiers,
			setActiveId,
			strategy: strategy ?? config.strategy,
		}),
		[
			id,
			items,
			modifiers,
			strategy,
			config.modifiers,
			config.strategy,
			activeId,
			getItemValue,
			flatCursor,
		]
	);

	return (
		<SortableRootContext.Provider
			value={contextValue as SortableRootContextValue<unknown>}
		>
			<DndContext
				collisionDetection={collisionDetection ?? config.collisionDetection}
				modifiers={modifiers ?? config.modifiers}
				sensors={sensors}
				{...sortableProps}
				accessibility={{
					announcements,
					screenReaderInstructions,
					...accessibility,
				}}
				id={id}
				onDragCancel={onDragCancel}
				onDragEnd={onDragEnd}
				onDragStart={onDragStart}
			/>
		</SortableRootContext.Provider>
	);
}

const SortableContentContext = createContext<boolean>(false);

interface SortableContentProps
	extends ComponentProps<"div">,
		useRender.ComponentProps<"div"> {
	children: ReactNode;
	strategy?: SortableContextProps["strategy"];
	withoutSlot?: boolean;
}

function SortableContent(props: SortableContentProps) {
	const {
		strategy: strategyProp,
		withoutSlot,
		children,
		className,
		render,
		ref,
		...contentProps
	} = props;

	const context = useSortableContext(CONTENT_NAME);

	const element = useRender({
		defaultTagName: "div",
		enabled: !withoutSlot,
		props: mergeProps<"div">(
			{
				children,
				className,
				ref,
			},
			contentProps
		),
		render,
		state: {
			slot: "sortable-content",
		},
	});

	const content = withoutSlot ? children : element;

	return (
		<SortableContentContext.Provider value>
			<SortableContext
				items={context.items}
				strategy={strategyProp ?? context.strategy}
			>
				{content}
			</SortableContext>
		</SortableContentContext.Provider>
	);
}

interface SortableItemContextValue {
	attributes: DraggableAttributes;
	disabled?: boolean;
	id: string;
	isDragging?: boolean;
	listeners: DraggableSyntheticListeners | undefined;
	setActivatorNodeRef: (node: HTMLElement | null) => void;
}

const SortableItemContext = createContext<SortableItemContextValue | null>(
	null
);

function useSortableItemContext(consumerName: string) {
	const context = useContext(SortableItemContext);
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`${ITEM_NAME}\``);
	}
	return context;
}

interface SortableItemProps
	extends ComponentProps<"div">,
		useRender.ComponentProps<"div"> {
	asHandle?: boolean;
	disabled?: boolean;
	value: UniqueIdentifier;
}

function SortableItem(props: SortableItemProps) {
	const {
		value,
		style,
		asHandle,
		disabled,
		className,
		render,
		ref,
		...itemProps
	} = props;

	const inSortableContent = useContext(SortableContentContext);
	const inSortableOverlay = useContext(SortableOverlayContext);

	if (!(inSortableContent || inSortableOverlay)) {
		throw new Error(
			`\`${ITEM_NAME}\` must be used within \`${CONTENT_NAME}\` or \`${OVERLAY_NAME}\``
		);
	}

	if (value === "") {
		throw new Error(`\`${ITEM_NAME}\` value cannot be an empty string`);
	}

	const context = useSortableContext(ITEM_NAME);
	const instanceId = useId();
	const id = itemProps.id ?? instanceId;
	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ disabled, id: value });

	const onNodeRefChange = useCallback(
		(node: HTMLElement | null) => {
			if (disabled) {
				return;
			}
			setNodeRef(node);
			if (asHandle) {
				setActivatorNodeRef(node);
			}
		},
		[disabled, asHandle, setNodeRef, setActivatorNodeRef]
	);

	const composedRef = useMergedRefs(ref, onNodeRefChange);

	const composedStyle = useMemo<CSSProperties>(
		() => ({
			transform: CSS.Translate.toString(transform),
			transition,
			...style,
		}),
		[transform, transition, style]
	);

	const itemContext = useMemo<SortableItemContextValue>(
		() => ({
			attributes,
			disabled,
			id,
			isDragging,
			listeners,
			setActivatorNodeRef,
		}),
		[id, attributes, listeners, setActivatorNodeRef, isDragging, disabled]
	);

	const handleProps =
		asHandle && !disabled ? { ...attributes, ...listeners } : undefined;

	const element = useRender({
		defaultTagName: "div",
		props: mergeProps<"div">(
			{
				className: cn(
					"focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
					{
						"cursor-default": context.flatCursor,
						"cursor-grab": !isDragging && asHandle && !context.flatCursor,
						"data-dragging:cursor-grabbing": !context.flatCursor,
						"opacity-50": isDragging,
						"pointer-events-none opacity-50": disabled,
						"touch-none select-none": asHandle,
					},
					className
				),
				id,
				ref: composedRef,
				style: composedStyle,
			},
			itemProps,
			handleProps
		),
		render,
		state: {
			slot: "sortable-item",
			...(disabled && { disabled: "" }),
			...(isDragging && { dragging: "" }),
		},
	});

	return (
		<SortableItemContext.Provider value={itemContext}>
			{element}
		</SortableItemContext.Provider>
	);
}

interface SortableItemHandleProps
	extends ComponentProps<"button">,
		useRender.ComponentProps<"button"> {}

function SortableItemHandle(props: SortableItemHandleProps) {
	const { disabled, className, render, ref, ...itemHandleProps } = props;

	const context = useSortableContext(ITEM_HANDLE_NAME);
	const itemContext = useSortableItemContext(ITEM_HANDLE_NAME);

	const isDisabled = disabled ?? itemContext.disabled;

	const { setActivatorNodeRef } = itemContext;

	const onActivatorNodeRef = useCallback(
		(node: HTMLElement | null) => {
			if (isDisabled) {
				return;
			}
			setActivatorNodeRef(node);
		},
		[isDisabled, setActivatorNodeRef]
	);

	const composedRef = useMergedRefs(ref, onActivatorNodeRef);

	const handleProps = isDisabled
		? undefined
		: { ...itemContext.attributes, ...itemContext.listeners };

	return useRender({
		defaultTagName: "button",
		props: mergeProps<"button">(
			{
				"aria-controls": itemContext.id,
				className: cn(
					"select-none disabled:pointer-events-none disabled:opacity-50",
					context.flatCursor
						? "cursor-default"
						: "cursor-grab data-dragging:cursor-grabbing",
					className
				),
				disabled: isDisabled,
				ref: composedRef,
				type: "button",
			},
			itemHandleProps,
			handleProps
		),
		render,
		state: {
			slot: "sortable-item-handle",
			...(isDisabled && { disabled: "" }),
			...(itemContext.isDragging && { dragging: "" }),
		},
	});
}

const SortableOverlayContext = createContext(false);

const dropAnimation: DropAnimation = {
	sideEffects: defaultDropAnimationSideEffects({
		styles: {
			active: {
				opacity: "0.4",
			},
		},
	}),
};

interface SortableOverlayProps
	extends Omit<ComponentProps<typeof DragOverlay>, "children"> {
	children?: ((params: { value: UniqueIdentifier }) => ReactNode) | ReactNode;
	container?: Element | DocumentFragment | null;
}

function SortableOverlay(props: SortableOverlayProps) {
	const { container: containerProp, children, ...overlayProps } = props;

	const context = useSortableContext(OVERLAY_NAME);

	const [mounted, setMounted] = useState(false);

	useIsoLayoutEffect(() => setMounted(true), []);

	const container =
		containerProp ?? (mounted ? globalThis.document?.body : null);

	if (!container) {
		return null;
	}

	return createPortal(
		<DragOverlay
			className={cn(!context.flatCursor && "cursor-grabbing")}
			dropAnimation={dropAnimation}
			modifiers={context.modifiers}
			{...overlayProps}
		>
			<SortableOverlayContext.Provider value>
				{overlayChildren(context.activeId, children)}
			</SortableOverlayContext.Provider>
		</DragOverlay>,
		container
	);
}

export {
	Sortable,
	SortableContent,
	SortableItem,
	SortableItemHandle,
	SortableOverlay,
	type SortableProps,
};

function overlayChildren(
	activeId: UniqueIdentifier | null,
	children: SortableOverlayProps["children"]
) {
	if (!activeId) {
		return null;
	}
	return typeof children === "function"
		? children({ value: activeId })
		: children;
}
