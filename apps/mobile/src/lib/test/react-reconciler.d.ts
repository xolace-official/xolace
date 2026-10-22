// react-reconciler ships untyped and is only used by the test host in
// mount-hook.ts; `@types/react-reconciler` isn't worth a dependency for that.
declare module 'react-reconciler';
declare module 'react-reconciler/constants';
