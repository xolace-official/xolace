import { act, createElement, type ReactNode } from 'react';
import Reconciler from 'react-reconciler';
import { DefaultEventPriority, NoEventPriority } from 'react-reconciler/constants';

/**
 * Mounts a hook once (effects included) and unmounts it, with no DOM — the
 * test runner has no jsdom, and a hook whose effect throws is exactly what
 * this is for — it propagates out of `act`.
 */
export function mountHook(hook: () => unknown): void {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const Probe = () => {
    hook();
    return null;
  };
  const container = { children: [] as unknown[] };
  const root = reconciler.createContainer(
    container, 0, null, false, null, '', noop, noop, noop, null,
  );
  act(() => reconciler.updateContainer(createElement(Probe) as ReactNode, root, null, null));
  act(() => reconciler.updateContainer(null, root, null, null));
}

const noop = () => {};
let currentUpdatePriority: number = NoEventPriority;
// Bare host config: nothing here renders, so every host op is a no-op.
const reconciler = Reconciler({
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  isPrimaryRenderer: true,
  createInstance: () => ({}),
  createTextInstance: () => ({}),
  appendInitialChild: noop,
  appendChild: noop,
  appendChildToContainer: noop,
  removeChild: noop,
  removeChildFromContainer: noop,
  insertBefore: noop,
  insertInContainerBefore: noop,
  finalizeInitialChildren: () => false,
  prepareUpdate: () => null,
  commitUpdate: noop,
  commitTextUpdate: noop,
  shouldSetTextContent: () => false,
  getRootHostContext: () => ({}),
  getChildHostContext: (ctx: object) => ctx,
  getPublicInstance: (i: unknown) => i,
  prepareForCommit: () => null,
  resetAfterCommit: noop,
  preparePortalMount: noop,
  clearContainer: noop,
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,
  getCurrentEventPriority: () => DefaultEventPriority,
  setCurrentUpdatePriority: (p: number) => { currentUpdatePriority = p; },
  getCurrentUpdatePriority: () => currentUpdatePriority,
  resolveUpdatePriority: () => currentUpdatePriority || DefaultEventPriority,
  getInstanceFromNode: () => null,
  beforeActiveInstanceBlur: noop,
  afterActiveInstanceBlur: noop,
  prepareScopeUpdate: noop,
  getInstanceFromScope: () => null,
  detachDeletedInstance: noop,
  resetFormInstance: noop,
  requestPostPaintCallback: noop,
  shouldAttemptEagerTransition: () => false,
  trackSchedulerEvent: noop,
  resolveEventType: () => null,
  resolveEventTimeStamp: () => -1,
  maySuspendCommit: () => false,
  preloadInstance: () => true,
  startSuspendingCommit: noop,
  suspendInstance: noop,
  waitForCommitToBeReady: () => null,
  NotPendingTransition: null,
  HostTransitionContext: { $$typeof: Symbol.for('react.context'), Provider: null, Consumer: null, _currentValue: null, _currentValue2: null, _threadCount: 0 },
  resetTextContent: noop,
  hideInstance: noop,
  unhideInstance: noop,
  hideTextInstance: noop,
  unhideTextInstance: noop,
} as any);
