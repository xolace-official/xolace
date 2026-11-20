import { act, createElement, type ReactNode } from "react";
import Reconciler from "react-reconciler";
import {
	DefaultEventPriority,
	NoEventPriority,
} from "react-reconciler/constants";

export function mountHook(hook: () => unknown): void {
	renderHook(hook, undefined).unmount();
}

export type RenderedHook<P, R> = {
	result: () => R;
	rerender: (props: P) => void;
	unmount: () => void;
};

/** Keeps the hook mounted, so a test can re-render it with new props. */
export function renderHook<P, R>(
	hook: (props: P) => R,
	props: P
): RenderedHook<P, R> {
	let latest: { value: R } | null = null;
	const Probe = (p: { props: P }) => {
		latest = { value: hook(p.props) };
		return null;
	};
	const tree = renderTree(createElement(Probe, { props }));
	return {
		rerender: (next: P) => tree.rerender(createElement(Probe, { props: next })),
		result: () => {
			if (!latest) {
				throw new Error("The hook has not rendered");
			}
			return latest.value;
		},
		unmount: tree.unmount,
	};
}

export type RenderedTree = {
	rerender: (node: ReactNode) => void;
	unmount: () => void;
};

/** Mounts components that render no host elements, so a test can see what mounts and remounts. */
export function renderTree(node: ReactNode): RenderedTree {
	(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
	const container = { children: [] as unknown[] };
	const root = reconciler.createContainer(
		container,
		0,
		null,
		false,
		null,
		"",
		noop,
		noop,
		noop,
		null
	);
	const render = (next: ReactNode) =>
		act(() => reconciler.updateContainer(next, root, null, null));
	render(node);
	return {
		rerender: render,
		unmount: () =>
			act(() => reconciler.updateContainer(null, root, null, null)),
	};
}

const noop = () => {};
let currentUpdatePriority: number = NoEventPriority;
const reconciler = Reconciler({
	afterActiveInstanceBlur: noop,
	appendChild: noop,
	appendChildToContainer: noop,
	appendInitialChild: noop,
	beforeActiveInstanceBlur: noop,
	cancelTimeout: clearTimeout,
	clearContainer: noop,
	commitTextUpdate: noop,
	commitUpdate: noop,
	createInstance: () => ({}),
	createTextInstance: () => ({}),
	detachDeletedInstance: noop,
	finalizeInitialChildren: () => false,
	getChildHostContext: (ctx: object) => ctx,
	getCurrentEventPriority: () => DefaultEventPriority,
	getCurrentUpdatePriority: () => currentUpdatePriority,
	getInstanceFromNode: () => null,
	getInstanceFromScope: () => null,
	getPublicInstance: (i: unknown) => i,
	getRootHostContext: () => ({}),
	HostTransitionContext: {
		_currentValue: null,
		_currentValue2: null,
		_threadCount: 0,
		$$typeof: Symbol.for("react.context"),
		Consumer: null,
		Provider: null,
	},
	hideInstance: noop,
	hideTextInstance: noop,
	insertBefore: noop,
	insertInContainerBefore: noop,
	isPrimaryRenderer: true,
	maySuspendCommit: () => false,
	NotPendingTransition: null,
	noTimeout: -1,
	preloadInstance: () => true,
	prepareForCommit: () => null,
	preparePortalMount: noop,
	prepareScopeUpdate: noop,
	prepareUpdate: () => null,
	removeChild: noop,
	removeChildFromContainer: noop,
	requestPostPaintCallback: noop,
	resetAfterCommit: noop,
	resetFormInstance: noop,
	resetTextContent: noop,
	resolveEventTimeStamp: () => -1,
	resolveEventType: () => null,
	resolveUpdatePriority: () => currentUpdatePriority || DefaultEventPriority,
	scheduleTimeout: setTimeout,
	setCurrentUpdatePriority: (p: number) => {
		currentUpdatePriority = p;
	},
	shouldAttemptEagerTransition: () => false,
	shouldSetTextContent: () => false,
	startSuspendingCommit: noop,
	supportsHydration: false,
	supportsMutation: true,
	supportsPersistence: false,
	suspendInstance: noop,
	trackSchedulerEvent: noop,
	unhideInstance: noop,
	unhideTextInstance: noop,
	waitForCommitToBeReady: () => null,
} as any);
