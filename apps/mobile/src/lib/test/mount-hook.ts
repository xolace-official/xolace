import { act, createElement, type ReactNode } from "react";
import Reconciler from "react-reconciler";
import {
	DefaultEventPriority,
	NoEventPriority,
} from "react-reconciler/constants";

/** Mounts a hook once (effects included) and unmounts it, with no DOM. A throwing effect
 * propagates out of `act`. */
export function mountHook(hook: () => unknown): void {
	(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
	const Probe = () => {
		hook();
		return null;
	};
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
	act(() =>
		reconciler.updateContainer(
			createElement(Probe) as ReactNode,
			root,
			null,
			null
		)
	);
	act(() => reconciler.updateContainer(null, root, null, null));
}

const noop = () => {};
let currentUpdatePriority: number = NoEventPriority;
// Bare host config: nothing here renders, so every host op is a no-op.
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
