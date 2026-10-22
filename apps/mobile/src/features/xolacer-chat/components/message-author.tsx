import { createContext, use, useMemo, type ReactNode } from 'react';
import {
  MessageAuthor,
  useMessageContext,
  type MessageAuthorProps,
} from 'stream-chat-expo';
import { resolveMessageIdentity } from '../utils';
import type { ThreadConversation } from './thread-screen';

/**
 * The conversation the message list is rendering, reachable from a component
 * mounted through Stream's override registry.
 *
 * A context rather than a closure because `WithComponents` memoizes its
 * overrides on mount and never re-reads them — an override that closed over
 * the conversation would be frozen at the first render's value. The override
 * component stays module-level and stable; the data moves through here.
 */
const ConversationIdentityContext = createContext<{
  conversation: ThreadConversation;
} | null>(null);

/** The conversation behind the currently mounted `WithComponents` override tree. */
export function useConversationIdentity() {
  return use(ConversationIdentityContext);
}

export function ConversationIdentityProvider({
  conversation,
  children,
}: {
  conversation: ThreadConversation;
  children: ReactNode;
}) {
  // Kept despite the React Compiler: a new value object here re-renders every
  // message bubble in the list, and the compiler doesn't stabilize across a
  // context boundary.
  const value = useMemo(() => ({ conversation }), [conversation]);
  return (
    <ConversationIdentityContext.Provider value={value}>
      {children}
    </ConversationIdentityContext.Provider>
  );
}

/**
 * The per-message avatar, sourced from the conversation instead of from
 * Stream's globally-shared user record — see `resolveMessageIdentity` for why
 * that record can't be trusted for display.
 *
 * Delegates to the SDK's own `MessageAuthor` with a patched `message`, rather
 * than reimplementing it: `message` is an explicit prop that wins over the
 * context value, so grouping, spacing, theming and memoization all stay the
 * SDK's. Importing the component directly (not via the override registry)
 * means no recursion back into this one.
 */
export function ConversationMessageAuthor(props: MessageAuthorProps) {
  const { message } = useMessageContext();
  const identity = useConversationIdentity();

  const override = identity
    ? resolveMessageIdentity(message.user?.id, identity.conversation)
    : null;
  if (!override || !message.user) return <MessageAuthor {...props} />;

  return (
    <MessageAuthor
      {...props}
      message={{
        ...message,
        user: { ...message.user, name: override.name, image: override.image },
      }}
    />
  );
}
