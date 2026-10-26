"use client";

import { useDirection } from "@base-ui/react/direction-provider";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";
import { useRefWithInit } from "@base-ui/utils/useRefWithInit";
import { useValueAsRef } from "@base-ui/utils/useValueAsRef";
import { cn } from "@xolace/ui/lib/utils";
import { Check } from "lucide-react";
import * as React from "react";

const ROOT_NAME = "Stepper";
const LIST_NAME = "StepperList";
const ITEM_NAME = "StepperItem";
const TRIGGER_NAME = "StepperTrigger";
const INDICATOR_NAME = "StepperIndicator";
const SEPARATOR_NAME = "StepperSeparator";
const TITLE_NAME = "StepperTitle";
const DESCRIPTION_NAME = "StepperDescription";
const CONTENT_NAME = "StepperContent";
const PREV_NAME = "StepperPrev";
const NEXT_NAME = "StepperNext";

const ENTRY_FOCUS = "stepperFocusGroup.onEntryFocus";
const EVENT_OPTIONS = { bubbles: false, cancelable: true };
const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

type Direction = "ltr" | "rtl";
type Orientation = "horizontal" | "vertical";
type NavigationDirection = "next" | "prev";
type ActivationMode = "automatic" | "manual";
type DataState = "inactive" | "active" | "completed";

interface DivProps
	extends React.ComponentProps<"div">,
		useRender.ComponentProps<"div"> {}
interface ButtonProps
	extends React.ComponentProps<"button">,
		useRender.ComponentProps<"button"> {}

type ListElement = HTMLDivElement;
type TriggerElement = HTMLButtonElement;

function getId(
	id: string,
	variant: "trigger" | "content" | "title" | "description",
	value: string
) {
	return `${id}-${variant}-${value}`;
}

type FocusIntent = "first" | "last" | "prev" | "next";

const MAP_KEY_TO_FOCUS_INTENT: Record<string, FocusIntent> = {
	ArrowDown: "next",
	ArrowLeft: "prev",
	ArrowRight: "next",
	ArrowUp: "prev",
	End: "last",
	Home: "first",
	PageDown: "last",
	PageUp: "first",
};

function getDirectionAwareKey(key: string, dir?: Direction) {
	if (dir !== "rtl") {
		return key;
	}
	return key === "ArrowLeft"
		? "ArrowRight"
		: key === "ArrowRight"
			? "ArrowLeft"
			: key;
}

function getFocusIntent(
	event: React.KeyboardEvent<TriggerElement>,
	dir?: Direction,
	orientation?: Orientation
) {
	const key = getDirectionAwareKey(event.key, dir);
	if (orientation === "horizontal" && ["ArrowUp", "ArrowDown"].includes(key)) {
		return;
	}
	if (orientation === "vertical" && ["ArrowLeft", "ArrowRight"].includes(key)) {
		return;
	}
	return MAP_KEY_TO_FOCUS_INTENT[key];
}

function focusFirst(
	candidates: React.RefObject<TriggerElement | null>[],
	preventScroll = false
) {
	const PREVIOUSLY_FOCUSED_ELEMENT = document.activeElement;
	for (const candidateRef of candidates) {
		const candidate = candidateRef.current;
		if (!candidate) {
			continue;
		}
		if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) {
			return;
		}
		candidate.focus({ preventScroll });
		if (document.activeElement !== PREVIOUSLY_FOCUSED_ELEMENT) {
			return;
		}
	}
}

function wrapArray<T>(array: T[], startIndex: number) {
	return array.map<T>(
		(_, index) => array[(startIndex + index) % array.length] as T
	);
}

function getDataState(
	value: string | undefined,
	itemValue: string,
	stepState: StepState | undefined,
	steps: Map<string, StepState>,
	variant: "item" | "separator" = "item"
): DataState {
	const stepKeys = Array.from(steps.keys());
	const currentIndex = stepKeys.indexOf(itemValue);

	if (stepState?.completed) {
		return "completed";
	}

	if (value === itemValue) {
		return variant === "separator" ? "inactive" : "active";
	}

	if (value) {
		const activeIndex = stepKeys.indexOf(value);

		if (activeIndex > currentIndex) {
			return "completed";
		}
	}

	return "inactive";
}

interface StepState {
	completed: boolean;
	disabled: boolean;
	value: string;
}

interface StoreState {
	steps: Map<string, StepState>;
	value: string;
}

interface Store {
	addStep: (value: string, completed: boolean, disabled: boolean) => void;
	getState: () => StoreState;
	hasValidation: () => boolean;
	notify: () => void;
	removeStep: (value: string) => void;
	setState: <K extends keyof StoreState>(key: K, value: StoreState[K]) => void;
	setStateWithValidation: (
		value: string,
		direction: NavigationDirection
	) => Promise<boolean>;
	setStep: (value: string, completed: boolean, disabled: boolean) => void;
	subscribe: (callback: () => void) => () => void;
}

const StoreContext = React.createContext<Store | null>(null);

function useStoreContext(consumerName: string) {
	const context = React.useContext(StoreContext);
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
	}
	return context;
}

function useStore<T>(selector: (state: StoreState) => T): T {
	const store = useStoreContext("useStore");

	const getSnapshot = React.useCallback(
		() => selector(store.getState()),
		[store, selector]
	);

	return React.useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

interface ItemData {
	active: boolean;
	disabled: boolean;
	id: string;
	ref: React.RefObject<TriggerElement | null>;
	value: string;
}

interface StepperContextValue {
	activationMode: ActivationMode;
	dir: Direction;
	disabled: boolean;
	loop: boolean;
	nonInteractive: boolean;
	orientation: Orientation;
	rootId: string;
}

const StepperContext = React.createContext<StepperContextValue | null>(null);

function useStepperContext(consumerName: string) {
	const context = React.useContext(StepperContext);
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
	}
	return context;
}

interface StepperProps extends DivProps {
	activationMode?: ActivationMode;
	defaultValue?: string;
	dir?: Direction;
	disabled?: boolean;
	loop?: boolean;
	nonInteractive?: boolean;
	onValidate?: (
		value: string,
		direction: NavigationDirection
	) => boolean | Promise<boolean>;
	onValueAdd?: (value: string) => void;
	onValueChange?: (value: string) => void;
	onValueComplete?: (value: string, completed: boolean) => void;
	onValueRemove?: (value: string) => void;
	orientation?: Orientation;
	value?: string;
}

function Stepper(props: StepperProps) {
	const {
		value,
		defaultValue,
		onValueChange,
		onValueComplete,
		onValueAdd,
		onValueRemove,
		onValidate,
		dir: dirProp,
		orientation = "horizontal",
		activationMode = "automatic",
		render,
		disabled = false,
		nonInteractive = false,
		loop = false,
		className,
		id,
		...rootProps
	} = props;

	const listenersRef = useRefWithInit(() => new Set<() => void>());
	const stateRef = useRefWithInit<StoreState>(() => ({
		steps: new Map(),
		value: value ?? defaultValue ?? "",
	}));

	const propsRef = useValueAsRef({
		onValidate,
		onValueAdd,
		onValueChange,
		onValueComplete,
		onValueRemove,
	});

	const store = React.useMemo<Store>(
		() => ({
			addStep: (value, completed, disabled) => {
				const newStep: StepState = { completed, disabled, value };
				stateRef.current.steps.set(value, newStep);
				propsRef.current.onValueAdd?.(value);
				store.notify();
			},
			getState: () => stateRef.current,
			hasValidation: () => !!propsRef.current.onValidate,
			notify: () => {
				for (const cb of listenersRef.current) {
					cb();
				}
			},
			removeStep: (value) => {
				stateRef.current.steps.delete(value);
				propsRef.current.onValueRemove?.(value);
				store.notify();
			},
			setState: (key, value) => {
				if (Object.is(stateRef.current[key], value)) {
					return;
				}

				if (key === "value" && typeof value === "string") {
					stateRef.current.value = value;
					propsRef.current.onValueChange?.(value);
				} else {
					stateRef.current[key] = value;
				}

				store.notify();
			},
			setStateWithValidation: async (value, direction) => {
				if (!propsRef.current.onValidate) {
					store.setState("value", value);
					return true;
				}

				try {
					const isValid = await propsRef.current.onValidate(value, direction);
					if (isValid) {
						store.setState("value", value);
					}
					return isValid;
				} catch {
					return false;
				}
			},
			setStep: (value, completed, disabled) => {
				const step = stateRef.current.steps.get(value);
				if (step) {
					const updatedStep: StepState = { ...step, completed, disabled };
					stateRef.current.steps.set(value, updatedStep);

					if (completed !== step.completed) {
						propsRef.current.onValueComplete?.(value, completed);
					}

					store.notify();
				}
			},
			subscribe: (cb) => {
				listenersRef.current.add(cb);
				return () => listenersRef.current.delete(cb);
			},
		}),
		[listenersRef, stateRef, propsRef]
	);

	useIsoLayoutEffect(() => {
		if (value !== undefined) {
			store.setState("value", value);
		}
	}, [value]);

	const contextDir = useDirection();
	const dir = dirProp ?? contextDir;

	const instanceId = React.useId();
	const rootId = id ?? instanceId;

	const contextValue = React.useMemo<StepperContextValue>(
		() => ({
			activationMode,
			dir,
			disabled,
			loop,
			nonInteractive,
			orientation,
			rootId,
		}),
		[rootId, dir, orientation, activationMode, disabled, nonInteractive, loop]
	);

	const element = useRender({
		defaultTagName: "div",
		props: mergeProps<"div">(
			{
				className: cn(
					"flex gap-6",
					orientation === "horizontal" ? "w-full flex-col" : "flex-row",
					className
				),
				dir,
				id: rootId,
			},
			rootProps
		),
		render,
		state: {
			disabled: disabled ? "" : undefined,
			orientation,
			slot: "stepper",
		},
	});

	return (
		<StoreContext.Provider value={store}>
			<StepperContext.Provider value={contextValue}>
				{element}
			</StepperContext.Provider>
		</StoreContext.Provider>
	);
}

interface FocusContextValue {
	getItems: () => ItemData[];
	onFocusableItemAdd: () => void;
	onFocusableItemRemove: () => void;
	onItemFocus: (tabStopId: string) => void;
	onItemRegister: (item: ItemData) => void;
	onItemShiftTab: () => void;
	onItemUnregister: (id: string) => void;
	tabStopId: string | null;
}

const FocusContext = React.createContext<FocusContextValue | null>(null);

function useFocusContext(consumerName: string) {
	const context = React.useContext(FocusContext);
	if (!context) {
		throw new Error(
			`\`${consumerName}\` must be used within \`FocusProvider\``
		);
	}
	return context;
}

function StepperList(props: DivProps) {
	const {
		render,
		onBlur: onBlurProp,
		onFocus: onFocusProp,
		onMouseDown: onMouseDownProp,
		className,
		children,
		ref,
		...listProps
	} = props;

	const context = useStepperContext(LIST_NAME);
	const orientation = context.orientation;
	const currentValue = useStore((state) => state.value);

	const propsRef = useValueAsRef({
		onBlur: onBlurProp,
		onFocus: onFocusProp,
		onMouseDown: onMouseDownProp,
	});

	const [tabStopId, setTabStopId] = React.useState<string | null>(null);
	const [isTabbingBackOut, setIsTabbingBackOut] = React.useState(false);
	const [focusableItemCount, setFocusableItemCount] = React.useState(0);
	const isClickFocusRef = React.useRef(false);
	const itemsRef = React.useRef<Map<string, ItemData>>(new Map());
	const listRef = React.useRef<ListElement>(null);
	const composedRef = useMergedRefs(ref, listRef);

	const onItemFocus = React.useCallback((tabStopId: string) => {
		setTabStopId(tabStopId);
	}, []);

	const onItemShiftTab = React.useCallback(() => {
		setIsTabbingBackOut(true);
	}, []);

	const onFocusableItemAdd = React.useCallback(() => {
		setFocusableItemCount((prevCount) => prevCount + 1);
	}, []);

	const onFocusableItemRemove = React.useCallback(() => {
		setFocusableItemCount((prevCount) => prevCount - 1);
	}, []);

	const onItemRegister = React.useCallback((item: ItemData) => {
		itemsRef.current.set(item.id, item);
	}, []);

	const onItemUnregister = React.useCallback((id: string) => {
		itemsRef.current.delete(id);
	}, []);

	const getItems = React.useCallback(
		() =>
			Array.from(itemsRef.current.values())
				.filter((item) => item.ref.current)
				.sort((a, b) => {
					const elementA = a.ref.current;
					const elementB = b.ref.current;
					if (!(elementA && elementB)) {
						return 0;
					}
					const position = elementA.compareDocumentPosition(elementB);
					if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
						return -1;
					}
					if (position & Node.DOCUMENT_POSITION_PRECEDING) {
						return 1;
					}
					return 0;
				}),
		[]
	);

	const onBlur = React.useCallback(
		(event: React.FocusEvent<ListElement>) => {
			propsRef.current.onBlur?.(event);
			if (event.defaultPrevented) {
				return;
			}

			setIsTabbingBackOut(false);
		},
		[propsRef]
	);

	const onFocus = React.useCallback(
		(event: React.FocusEvent<ListElement>) => {
			propsRef.current.onFocus?.(event);
			if (event.defaultPrevented) {
				return;
			}

			const isKeyboardFocus = !isClickFocusRef.current;
			if (
				event.target === event.currentTarget &&
				isKeyboardFocus &&
				!isTabbingBackOut
			) {
				const entryFocusEvent = new CustomEvent(ENTRY_FOCUS, EVENT_OPTIONS);
				event.currentTarget.dispatchEvent(entryFocusEvent);

				if (!entryFocusEvent.defaultPrevented) {
					const items = Array.from(itemsRef.current.values()).filter(
						(item) => !item.disabled
					);
					const selectedItem = currentValue
						? items.find((item) => item.value === currentValue)
						: undefined;
					const activeItem = items.find((item) => item.active);
					const currentItem = items.find((item) => item.id === tabStopId);

					const candidateItems = [
						selectedItem,
						activeItem,
						currentItem,
						...items,
					].filter(Boolean) as ItemData[];
					const candidateRefs = candidateItems.map((item) => item.ref);
					focusFirst(candidateRefs, false);
				}
			}
			isClickFocusRef.current = false;
		},
		[propsRef, isTabbingBackOut, currentValue, tabStopId]
	);

	const onMouseDown = React.useCallback(
		(event: React.MouseEvent<ListElement>) => {
			propsRef.current.onMouseDown?.(event);

			if (event.defaultPrevented) {
				return;
			}

			isClickFocusRef.current = true;
		},
		[propsRef]
	);

	const focusContextValue = React.useMemo<FocusContextValue>(
		() => ({
			getItems,
			onFocusableItemAdd,
			onFocusableItemRemove,
			onItemFocus,
			onItemRegister,
			onItemShiftTab,
			onItemUnregister,
			tabStopId,
		}),
		[
			tabStopId,
			onItemFocus,
			onItemShiftTab,
			onFocusableItemAdd,
			onFocusableItemRemove,
			onItemRegister,
			onItemUnregister,
			getItems,
		]
	);

	const element = useRender({
		defaultTagName: "div",
		props: mergeProps<"div">(
			{
				"aria-orientation": orientation,
				children,
				className: cn(
					"flex outline-none",
					orientation === "horizontal"
						? "flex-row items-center"
						: "flex-col items-start",
					className
				),
				dir: context.dir,
				onBlur,
				onFocus,
				onMouseDown,
				ref: composedRef,
				role: "tablist",
				tabIndex: isTabbingBackOut || focusableItemCount === 0 ? -1 : 0,
			},
			listProps
		),
		render,
		state: {
			orientation,
			slot: "stepper-list",
		},
	});

	return (
		<FocusContext.Provider value={focusContextValue}>
			{element}
		</FocusContext.Provider>
	);
}

interface StepperItemContextValue {
	stepState: StepState | undefined;
	value: string;
}

const StepperItemContext = React.createContext<StepperItemContextValue | null>(
	null
);

function useStepperItemContext(consumerName: string) {
	const context = React.useContext(StepperItemContext);
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`${ITEM_NAME}\``);
	}
	return context;
}

interface StepperItemProps extends DivProps {
	completed?: boolean;
	disabled?: boolean;
	value: string;
}

function StepperItem(props: StepperItemProps) {
	const {
		value: itemValue,
		completed = false,
		disabled = false,
		render,
		className,
		children,
		ref,
		...itemProps
	} = props;

	const context = useStepperContext(ITEM_NAME);
	const store = useStoreContext(ITEM_NAME);
	const orientation = context.orientation;
	const value = useStore((state) => state.value);

	useIsoLayoutEffect(() => {
		store.addStep(itemValue, completed, disabled);

		return () => {
			store.removeStep(itemValue);
		};
	}, [itemValue, completed, disabled]);

	useIsoLayoutEffect(() => {
		store.setStep(itemValue, completed, disabled);
	}, [itemValue, completed, disabled]);

	const stepState = useStore((state) => state.steps.get(itemValue));
	const steps = useStore((state) => state.steps);
	const dataState = getDataState(value, itemValue, stepState, steps);

	const itemContextValue = React.useMemo<StepperItemContextValue>(
		() => ({
			stepState,
			value: itemValue,
		}),
		[itemValue, stepState]
	);

	const element = useRender({
		defaultTagName: "div",
		props: mergeProps<"div">(
			{
				children,
				className: cn(
					"relative flex not-last:flex-1 items-center",
					orientation === "horizontal" ? "flex-row" : "flex-col",
					className
				),
				dir: context.dir,
				ref,
			},
			itemProps
		),
		render,
		state: {
			disabled: stepState?.disabled ? "" : undefined,
			orientation,
			slot: "stepper-item",
			state: dataState,
		},
	});

	return (
		<StepperItemContext.Provider value={itemContextValue}>
			{element}
		</StepperItemContext.Provider>
	);
}

function StepperTrigger(props: ButtonProps) {
	const {
		render,
		onClick: onClickProp,
		onFocus: onFocusProp,
		onKeyDown: onKeyDownProp,
		onMouseDown: onMouseDownProp,
		disabled,
		className,
		ref,
		...triggerProps
	} = props;

	const context = useStepperContext(TRIGGER_NAME);
	const itemContext = useStepperItemContext(TRIGGER_NAME);
	const itemValue = itemContext.value;

	const store = useStoreContext(TRIGGER_NAME);
	const focusContext = useFocusContext(TRIGGER_NAME);
	const value = useStore((state) => state.value);
	const steps = useStore((state) => state.steps);
	const stepState = useStore((state) => state.steps.get(itemValue));

	const propsRef = useValueAsRef({
		onClick: onClickProp,
		onFocus: onFocusProp,
		onKeyDown: onKeyDownProp,
		onMouseDown: onMouseDownProp,
	});

	const activationMode = context.activationMode;
	const orientation = context.orientation;
	const loop = context.loop;

	const stepIndex = Array.from(steps.keys()).indexOf(itemValue);

	const stepPosition = stepIndex + 1;
	const stepCount = steps.size;

	const triggerId = getId(context.rootId, "trigger", itemValue);
	const contentId = getId(context.rootId, "content", itemValue);
	const titleId = getId(context.rootId, "title", itemValue);
	const descriptionId = getId(context.rootId, "description", itemValue);

	const isDisabled = disabled || stepState?.disabled || context.disabled;
	const isActive = value === itemValue;
	const isTabStop = focusContext.tabStopId === triggerId;
	const dataState = getDataState(value, itemValue, stepState, steps);

	const triggerRef = React.useRef<TriggerElement>(null);
	const composedRef = useMergedRefs(ref, triggerRef);
	const isArrowKeyPressedRef = React.useRef(false);
	const isMouseClickRef = React.useRef(false);

	React.useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (ARROW_KEYS.includes(event.key)) {
				isArrowKeyPressedRef.current = true;
			}
		}
		function onKeyUp() {
			isArrowKeyPressedRef.current = false;
		}
		document.addEventListener("keydown", onKeyDown);
		document.addEventListener("keyup", onKeyUp);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.removeEventListener("keyup", onKeyUp);
		};
	}, []);

	useIsoLayoutEffect(() => {
		focusContext.onItemRegister({
			active: isTabStop,
			disabled: !!isDisabled,
			id: triggerId,
			ref: triggerRef,
			value: itemValue,
		});

		if (!isDisabled) {
			focusContext.onFocusableItemAdd();
		}

		return () => {
			focusContext.onItemUnregister(triggerId);
			if (!isDisabled) {
				focusContext.onFocusableItemRemove();
			}
		};
	}, [focusContext, triggerId, itemValue, isTabStop, isDisabled]);

	const onClick = React.useCallback(
		async (event: React.MouseEvent<TriggerElement>) => {
			propsRef.current.onClick?.(event);
			if (event.defaultPrevented) {
				return;
			}

			if (!(isDisabled || context.nonInteractive)) {
				const currentStepIndex = Array.from(steps.keys()).indexOf(value ?? "");
				const targetStepIndex = Array.from(steps.keys()).indexOf(itemValue);
				const direction = targetStepIndex > currentStepIndex ? "next" : "prev";

				await store.setStateWithValidation(itemValue, direction);
			}
		},
		[
			isDisabled,
			context.nonInteractive,
			store,
			itemValue,
			value,
			steps,
			propsRef,
		]
	);

	const onFocus = React.useCallback(
		async (event: React.FocusEvent<TriggerElement>) => {
			propsRef.current.onFocus?.(event);
			if (event.defaultPrevented) {
				return;
			}

			focusContext.onItemFocus(triggerId);

			const isKeyboardFocus = !isMouseClickRef.current;

			if (
				!(isActive || isDisabled) &&
				activationMode !== "manual" &&
				!context.nonInteractive &&
				isKeyboardFocus
			) {
				const currentStepIndex = Array.from(steps.keys()).indexOf(value || "");
				const targetStepIndex = Array.from(steps.keys()).indexOf(itemValue);
				const direction = targetStepIndex > currentStepIndex ? "next" : "prev";

				await store.setStateWithValidation(itemValue, direction);
			}

			isMouseClickRef.current = false;
		},
		[
			focusContext,
			triggerId,
			activationMode,
			isActive,
			isDisabled,
			context.nonInteractive,
			store,
			itemValue,
			value,
			steps,
			propsRef,
		]
	);

	const onKeyDown = React.useCallback(
		async (event: React.KeyboardEvent<TriggerElement>) => {
			propsRef.current.onKeyDown?.(event);
			if (event.defaultPrevented) {
				return;
			}

			if (event.key === "Enter" && context.nonInteractive) {
				event.preventDefault();
				return;
			}

			if (
				(event.key === "Enter" || event.key === " ") &&
				activationMode === "manual" &&
				!context.nonInteractive
			) {
				event.preventDefault();
				if (!isDisabled && triggerRef.current) {
					triggerRef.current.click();
				}
				return;
			}

			if (event.key === "Tab" && event.shiftKey) {
				focusContext.onItemShiftTab();
				return;
			}

			if (event.target !== event.currentTarget) {
				return;
			}

			const focusIntent = getFocusIntent(event, context.dir, orientation);

			if (focusIntent !== undefined) {
				if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
					return;
				}
				event.preventDefault();

				const items = focusContext.getItems().filter((item) => !item.disabled);
				let candidateRefs = items.map((item) => item.ref);

				if (focusIntent === "last") {
					candidateRefs.reverse();
				} else if (focusIntent === "prev" || focusIntent === "next") {
					if (focusIntent === "prev") {
						candidateRefs.reverse();
					}
					const currentIndex = candidateRefs.findIndex(
						(ref) => ref.current === event.currentTarget
					);
					candidateRefs = loop
						? wrapArray(candidateRefs, currentIndex + 1)
						: candidateRefs.slice(currentIndex + 1);
				}

				if (store.hasValidation() && candidateRefs.length > 0) {
					const nextRef = candidateRefs[0];
					const nextElement = nextRef?.current;
					const nextItem = items.find(
						(item) => item.ref.current === nextElement
					);

					if (nextItem && nextItem.value !== itemValue) {
						const currentStepIndex = Array.from(steps.keys()).indexOf(
							value || ""
						);
						const targetStepIndex = Array.from(steps.keys()).indexOf(
							nextItem.value
						);
						const direction: NavigationDirection =
							targetStepIndex > currentStepIndex ? "next" : "prev";

						if (direction === "next") {
							const isValid = await store.setStateWithValidation(
								nextItem.value,
								direction
							);
							if (!isValid) {
								return;
							}
						} else {
							store.setState("value", nextItem.value);
						}

						queueMicrotask(() => nextElement?.focus());
						return;
					}
				}

				queueMicrotask(() => focusFirst(candidateRefs));
			}
		},
		[
			focusContext,
			context.nonInteractive,
			context.dir,
			activationMode,
			orientation,
			loop,
			isDisabled,
			store,
			propsRef,
			itemValue,
			value,
			steps,
		]
	);

	const onMouseDown = React.useCallback(
		(event: React.MouseEvent<TriggerElement>) => {
			propsRef.current.onMouseDown?.(event);
			if (event.defaultPrevented) {
				return;
			}

			isMouseClickRef.current = true;

			if (isDisabled) {
				event.preventDefault();
			} else {
				focusContext.onItemFocus(triggerId);
			}
		},
		[focusContext, triggerId, isDisabled, propsRef]
	);

	return useRender({
		defaultTagName: "button",
		props: mergeProps<"button">(
			{
				"aria-controls": contentId,
				"aria-current": isActive ? "step" : undefined,
				"aria-describedby": `${titleId} ${descriptionId}`,
				"aria-posinset": stepPosition,
				"aria-selected": isActive,
				"aria-setsize": stepCount,
				className: cn(
					"group/stepper-trigger inline-flex cursor-pointer items-center gap-3 rounded-md text-left outline-none transition-colors focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-[18px] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[2.5]",
					className
				),
				disabled: isDisabled,
				id: triggerId,
				onClick,
				onFocus,
				onKeyDown,
				onMouseDown,
				ref: composedRef,
				role: "tab",
				tabIndex: isTabStop ? 0 : -1,
				type: "button",
			},
			triggerProps
		),
		render,
		state: {
			disabled: isDisabled ? "" : undefined,
			slot: "stepper-trigger",
			state: dataState,
		},
	});
}

interface StepperIndicatorProps
	extends Omit<DivProps, "children">,
		Omit<useRender.ComponentProps<"div">, "children"> {
	children?: React.ReactNode | ((dataState: DataState) => React.ReactNode);
}

function StepperIndicator(props: StepperIndicatorProps) {
	const { className, children, render, ref, ...indicatorProps } = props;

	const context = useStepperContext(INDICATOR_NAME);
	const itemContext = useStepperItemContext(INDICATOR_NAME);

	const value = useStore((state) => state.value);
	const itemValue = itemContext.value;
	const stepState = useStore((state) => state.steps.get(itemValue));
	const steps = useStore((state) => state.steps);

	const stepPosition = Array.from(steps.keys()).indexOf(itemValue) + 1;

	const dataState = getDataState(value, itemValue, stepState, steps);

	return useRender({
		defaultTagName: "div",
		props: mergeProps<"div">(
			{
				children:
					typeof children === "function" ? (
						children(dataState)
					) : children ? (
						children
					) : dataState === "completed" ? (
						<Check />
					) : (
						stepPosition
					),
				className: cn(
					"lip lip-line-strong depth-sm data-[state=active]:lip-lavender-lip data-[state=completed]:lip-mint-lip flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-line-strong bg-surface font-display font-extrabold text-ink-muted text-sm transition-colors data-[state=active]:border-lavender data-[state=completed]:border-mint data-[state=active]:bg-lavender data-[state=completed]:bg-mint data-[state=active]:text-on-lavender data-[state=completed]:text-on-mint",
					className
				),
				dir: context.dir,
				ref,
			},
			indicatorProps
		),
		render,
		state: {
			slot: "stepper-indicator",
			state: dataState,
		},
	});
}

interface StepperSeparatorProps extends DivProps {
	forceMount?: boolean;
}

function StepperSeparator(props: StepperSeparatorProps) {
	const {
		className,
		render,
		forceMount = false,
		ref,
		...separatorProps
	} = props;

	const context = useStepperContext(SEPARATOR_NAME);
	const itemContext = useStepperItemContext(SEPARATOR_NAME);
	const value = useStore((state) => state.value);
	const steps = useStore((state) => state.steps);

	const orientation = context.orientation;

	const stepIndex = Array.from(steps.keys()).indexOf(itemContext.value);

	const isLastStep = stepIndex === steps.size - 1;

	const dataState = getDataState(
		value,
		itemContext.value,
		itemContext.stepState,
		steps,
		"separator"
	);

	const element = useRender({
		defaultTagName: "div",
		props: mergeProps<"div">(
			{
				"aria-hidden": "true",
				"aria-orientation": orientation,
				className: cn(
					"rounded-full bg-line transition-colors data-[state=completed]:bg-mint",
					orientation === "horizontal"
						? "mx-3 h-1 flex-1"
						: "my-2 ms-5 h-10 w-1",
					className
				),
				dir: context.dir,
				ref,
				role: "separator",
			},
			separatorProps
		),
		render,
		state: {
			orientation,
			slot: "stepper-separator",
			state: dataState,
		},
	});

	if (isLastStep && !forceMount) {
		return null;
	}

	return element;
}

interface StepperTitleProps
	extends React.ComponentProps<"span">,
		useRender.ComponentProps<"span"> {}

function StepperTitle(props: StepperTitleProps) {
	const { className, render, ref, ...titleProps } = props;

	const context = useStepperContext(TITLE_NAME);
	const itemContext = useStepperItemContext(TITLE_NAME);

	const titleId = getId(context.rootId, "title", itemContext.value);

	return useRender({
		defaultTagName: "span",
		props: mergeProps<"span">(
			{
				className: cn(
					"font-display font-extrabold text-ink text-sm group-disabled/stepper-trigger:text-ink-muted",
					className
				),
				dir: context.dir,
				id: titleId,
				ref,
			},
			titleProps
		),
		render,
		state: {
			slot: "title",
		},
	});
}

interface StepperDescriptionProps
	extends React.ComponentProps<"span">,
		useRender.ComponentProps<"span"> {}

function StepperDescription(props: StepperDescriptionProps) {
	const { className, render, ref, ...descriptionProps } = props;

	const context = useStepperContext(DESCRIPTION_NAME);
	const itemContext = useStepperItemContext(DESCRIPTION_NAME);

	const descriptionId = getId(context.rootId, "description", itemContext.value);

	return useRender({
		defaultTagName: "span",
		props: mergeProps<"span">(
			{
				className: cn("text-ink-muted text-xs", className),
				dir: context.dir,
				id: descriptionId,
				ref,
			},
			descriptionProps
		),
		render,
		state: {
			slot: "description",
		},
	});
}

interface StepperContentProps extends DivProps {
	forceMount?: boolean;
	value: string;
}

function StepperContent(props: StepperContentProps) {
	const {
		value: valueProp,
		render,
		forceMount = false,
		ref,
		className,
		...contentProps
	} = props;

	const context = useStepperContext(CONTENT_NAME);
	const value = useStore((state) => state.value);

	const contentId = getId(context.rootId, "content", valueProp);
	const triggerId = getId(context.rootId, "trigger", valueProp);

	const element = useRender({
		defaultTagName: "div",
		props: mergeProps<"div">(
			{
				"aria-labelledby": triggerId,
				className: cn("flex-1 outline-none", className),
				dir: context.dir,
				id: contentId,
				ref,
				role: "tabpanel",
			},
			contentProps
		),
		render,
		state: {
			slot: "stepper-content",
		},
	});

	if (valueProp !== value && !forceMount) {
		return null;
	}

	return element;
}

function StepperPrev(props: ButtonProps) {
	const { render, onClick: onClickProp, disabled, ...prevProps } = props;

	const store = useStoreContext(PREV_NAME);
	const value = useStore((state) => state.value);
	const steps = useStore((state) => state.steps);

	const propsRef = useValueAsRef({
		onClick: onClickProp,
	});

	const stepKeys = Array.from(steps.keys());
	const currentIndex = value ? stepKeys.indexOf(value) : -1;
	const isDisabled = disabled || currentIndex <= 0;

	const onClick = React.useCallback(
		async (event: React.MouseEvent<HTMLButtonElement>) => {
			propsRef.current.onClick?.(event);
			if (event.defaultPrevented || isDisabled) {
				return;
			}

			const prevIndex = Math.max(currentIndex - 1, 0);
			const prevStepValue = stepKeys[prevIndex];

			if (prevStepValue) {
				store.setState("value", prevStepValue);
			}
		},
		[propsRef, isDisabled, currentIndex, stepKeys, store]
	);

	return useRender({
		defaultTagName: "button",
		props: mergeProps<"button">(
			{
				disabled: isDisabled,
				onClick,
				type: "button",
			},
			prevProps
		),
		render,
		state: {
			slot: "stepper-prev",
		},
	});
}

function StepperNext(props: ButtonProps) {
	const { render, onClick: onClickProp, disabled, ...nextProps } = props;

	const store = useStoreContext(NEXT_NAME);
	const value = useStore((state) => state.value);
	const steps = useStore((state) => state.steps);

	const propsRef = useValueAsRef({
		onClick: onClickProp,
	});

	const stepKeys = Array.from(steps.keys());
	const currentIndex = value ? stepKeys.indexOf(value) : -1;
	const isDisabled = disabled || currentIndex >= stepKeys.length - 1;

	const onClick = React.useCallback(
		async (event: React.MouseEvent<HTMLButtonElement>) => {
			propsRef.current.onClick?.(event);
			if (event.defaultPrevented || isDisabled) {
				return;
			}

			const nextIndex = Math.min(currentIndex + 1, stepKeys.length - 1);
			const nextStepValue = stepKeys[nextIndex];

			if (nextStepValue) {
				await store.setStateWithValidation(nextStepValue, "next");
			}
		},
		[propsRef, isDisabled, currentIndex, stepKeys, store]
	);

	return useRender({
		defaultTagName: "button",
		props: mergeProps<"button">(
			{
				disabled: isDisabled,
				onClick,
				type: "button",
			},
			nextProps
		),
		render,
		state: {
			slot: "stepper-next",
		},
	});
}

export {
	Stepper,
	StepperContent,
	StepperDescription,
	StepperIndicator,
	StepperItem,
	StepperList,
	StepperNext,
	StepperPrev,
	type StepperProps,
	StepperSeparator,
	StepperTitle,
	StepperTrigger,
	useStore as useStepper,
};
