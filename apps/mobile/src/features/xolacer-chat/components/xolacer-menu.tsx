import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useToast } from 'heroui-native';
import { useAction } from 'convex/react';
import BlockIcon from '@expo/material-symbols/block.xml';
import FlagIcon from '@expo/material-symbols/flag.xml';
import StarIcon from '@expo/material-symbols/star.xml';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { OverflowMenu } from '@/src/components/shared/overflow-menu';
import { ConfirmationDialog } from '@/src/components/shared/confirmation-dialog';
import { useTray } from '@/src/features/feedback-tray/engine/tray-provider';
import type { Trays } from '@/src/features/feedback-tray/screens/registry';
import { playSoftPress } from '@/src/lib/haptics';

/**
 * The overflow menu for a xolacer — mounted in the thread and on the profile:
 * Report and Block, together on purpose, since someone reaching for one usually
 * wants the other.
 *
 * Block sits behind a confirmation because it cannot be undone — the server
 * refuses to reopen a conversation closed this way, and that refusal is the
 * point. The confirmation says so out loud. Both roles get it: a xolacer's
 * only other exit stops working the moment they accept a request.
 *
 * Report opens the feedback tray in concern mode, carrying the subject's
 * profile id and — from a thread only — that conversation's id. A report from a
 * profile is about the person, not an exchange: the bio or the display name can
 * itself be what is being reported, and the profile is reachable from the
 * roster with no conversation at all. `origin` is what decides that, not the
 * presence of `conversationId`, which is also the block target. The display
 * name goes no further than the form's copy.
 *
 * Rate is the secondary entry to the rating screen — the primary one is the
 * card on the xolacer's profile. Offered on any status once the seeker is
 * eligible, which the caller decides with `rateCtaState`; this component only
 * picks the wording.
 *
 * Block is conditionally *mounted*, never `hidden`: a profile reached from the
 * roster may have no conversation row, and there is no channel and nothing to
 * escape. (A hidden toolbar item also leaves a transparent touch-eating band
 * across the top on Android.)
 */
export function XolacerMenu({
  profileId,
  name,
  conversationId,
  origin,
  hasHistory = true,
  rateState = 'hidden',
}: {
  profileId: Id<'emotional_profiles'>;
  name: string;
  conversationId?: Id<'xolacer_conversations'>;
  origin: 'thread' | 'profile';
  /** Whether anything was ever written here — see `hasSpoken`. */
  hasHistory?: boolean;
  /** Whether to offer rating here, and in which wording — see `rateCtaState`. */
  rateState?: 'hidden' | 'prompt' | 'rated';
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { show } = useTray<Trays>();
  const blockConversation = useAction(api.xolacerChat.blockConversation);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  const handleBlock = () => {
    if (pending || !conversationId) return;
    setPending(true);
    blockConversation({ conversationId })
      .then(() => {
        setConfirming(false);
        // The row is gone from the list behind us; nothing here to return to.
        router.back();
      })
      .catch((err) => {
        console.error('[xolacer-chat] block failed', err);
        // Closed, not left open mid-claim: nothing was blocked, and the server
        // is idempotent, so opening the menu again and retrying is harmless.
        setConfirming(false);
        toast.show({
          label: "Couldn't block this conversation",
          description: 'Something went wrong. Try again.',
        });
      })
      .finally(() => setPending(false));
  };

  return (
    <>
      <OverflowMenu>
        {rateState !== 'hidden' && conversationId && (
          <OverflowMenu.Action
            icon={process.env.EXPO_OS === 'ios' ? 'star' : StarIcon}
            onPress={() => {
              playSoftPress();
              router.push({
                pathname: '/rate/[conversationId]',
                params: { conversationId },
              });
            }}
          >
            {rateState === 'prompt' ? 'Rate this conversation' : 'Change your rating'}
          </OverflowMenu.Action>
        )}

        <OverflowMenu.Action
          icon={process.env.EXPO_OS === 'ios' ? 'flag' : FlagIcon}
          onPress={() => {
            playSoftPress();
            show('report', {
              kind: 'concern',
              subject: {
                profileId,
                name,
                conversationId:
                  origin === 'thread' ? conversationId : undefined,
              },
            });
          }}
        >
          Report
        </OverflowMenu.Action>

        {conversationId && (
          <OverflowMenu.Action
            destructive
            icon={process.env.EXPO_OS === 'ios' ? 'hand.raised' : BlockIcon}
            onPress={() => {
              playSoftPress();
              setConfirming(true);
            }}
          >
            Block
          </OverflowMenu.Action>
        )}
      </OverflowMenu>

      <ConfirmationDialog
        isOpen={confirming}
        onOpenChange={setConfirming}
        title="Block this conversation?"
        description={
          hasHistory
            ? "Neither of you will be able to send another message here, and this can't be undone. Everything already written stays."
            : "Neither of you will be able to send another message here, and this can't be undone."
        }
        confirmLabel="Block"
        onConfirm={handleBlock}
        isDestructive
        isLoading={pending}
      />
    </>
  );
}
