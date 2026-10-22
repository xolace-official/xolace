import { useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Skeleton, Switch, useThemeColor, useToast } from 'heroui-native';
import { SymbolView } from 'expo-symbols';
import CheckIcon from '@expo/material-symbols/check.xml';
import CloseIcon from '@expo/material-symbols/close.xml';
import { AppText } from '@/src/components/shared/app-text';
import { playSoftPress } from '@/src/lib/haptics';
import { PhotoStep } from './photo-step';
import { SpecialtyPicker } from './specialty-picker';
import { BioStep, NameStep } from './text-steps';
import { firstIncompleteStep } from './steps';
import { useXolacerSetup } from './use-xolacer-setup';

const styles = StyleSheet.create({ borderCurve: { borderCurve: 'continuous' } });

const SCREEN_OPTIONS = { title: 'Edit profile', headerShown: true } as const;

const ICON = {
  active: { ios: 'dot.radiowaves.left.and.right', android: 'sensors', web: 'sensors' },
  paused: { ios: 'moon.zzz.fill', android: 'bedtime', web: 'bedtime' },
} as const;

/**
 * Editing an already-published profile: one page, every field at once — the
 * opposite of the setup wizard, because someone fixing a typo shouldn't have to
 * walk five steps to reach it. The draft state is the setup flow's, so the two
 * can never disagree about what a valid profile is.
 *
 * Cancel and Save sit in the sheet's own header rather than in the body, so the
 * form scrolls under a bar that stays put, and Save can be visibly disabled
 * while the draft is short of what the server will publish.
 *
 * Two controls here write immediately rather than waiting on Save — the photo
 * (it uploads on pick) and the listed/paused switch (the thing someone reaches
 * for when they're too drained to be found). Both say so on screen, because
 * "Cancel" otherwise promises to undo them and can't: replacing a photo keeps
 * only the new URL, so there is no old one to put back.
 */
export function XolacerEditScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const accent = useThemeColor('accent') as string;
  const setup = useXolacerSetup();
  const [saving, setSaving] = useState(false);

  const { draft } = setup;
  const blocking = firstIncompleteStep(draft);
  const savable = blocking === null && !saving && !setup.missing;

  const close = () => {
    Keyboard.dismiss();
    playSoftPress();
    router.back();
  };

  const handleSave = () => {
    if (!savable) return;
    Keyboard.dismiss();
    playSoftPress();
    setSaving(true);
    setup
      .saveText()
      .then(() => {
        toast.show({ label: 'Profile updated.' });
        router.back();
      })
      // Left open on failure, edits intact — a dropped connection shouldn't
      // cost someone the bio they just rewrote.
      .catch((error: unknown) => {
        console.error('[xolacer-edit] save failed', error);
        toast.show({ label: "Couldn't save that. Check your connection." });
      })
      .finally(() => setSaving(false));
  };

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          variant="plain"
          icon={process.env.EXPO_OS === 'ios' ? undefined : CloseIcon}
          accessibilityLabel="Close"
          onPress={close}
        >
          Cancel
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          variant="prominent"
          tintColor={accent}
          icon={process.env.EXPO_OS === 'ios' ? undefined : CheckIcon}
          disabled={!savable}
          accessibilityLabel="Save profile"
          onPress={handleSave}
        >
          {saving ? 'Saving…' : 'Save'}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>

      {setup.loading ? (
        <EditSkeleton />
      ) : setup.missing ? (
        <Unavailable />
      ) : (
        <KeyboardAwareScrollView
          className="flex-1 bg-background"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="px-5 pb-10 gap-2"
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          // Clears the bio's character counter and the line under it, so the
          // field a xolacer is typing in is never the last thing on screen
          // with its own feedback hidden behind the keyboard.
          bottomOffset={140}
        >
          <PhotoStep
            photoUrl={draft.photoUrl}
            uploading={setup.uploading}
            onPick={setup.pickPhoto}
          />
          <AppText className="pb-1 text-center text-[11px] text-muted">
            A new photo replaces the old one straight away.
          </AppText>
          <NameStep
            value={draft.displayName}
            onChange={(next) => setup.setField('displayName', next)}
          />
          <BioStep value={draft.bio} onChange={(next) => setup.setField('bio', next)} />
          <SpecialtyPicker selected={draft.specialties} onToggle={setup.toggleSpecialty} />
          <ListedToggle active={setup.active} onChange={setup.setActive} />

          {blocking && (
            <AppText className="px-0.5 pt-1 text-[11px] text-warning">
              Your profile is live — {blocking.missingLabel} before saving.
            </AppText>
          )}
        </KeyboardAwareScrollView>
      )}
    </>
  );
}

/**
 * The route is reachable by deep link, and a profile can stop existing between
 * the sheet opening and this render (chat switched off, xolacer status
 * revoked). Saying so beats a form whose Save can never light up.
 */
function Unavailable() {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-background px-10">
      <AppText className="text-[15px] font-semibold text-foreground">
        No profile to edit
      </AppText>
      <AppText className="text-center text-[13px] leading-5 text-muted">
        There&apos;s no Xolacer profile on this account right now.
      </AppText>
    </View>
  );
}

/** Immediate, like the card on Connect it replaced — and it says so. */
function ListedToggle({
  active,
  onChange,
}: {
  active: boolean;
  onChange: (next: boolean) => void;
}) {
  const accent = useThemeColor('accent') as string;
  const muted = useThemeColor('muted') as string;

  return (
    <View
      className="mt-4 flex-row items-center gap-3 rounded-3xl border border-border/40 bg-surface p-4"
      style={styles.borderCurve}
    >
      <SymbolView
        name={active ? ICON.active : ICON.paused}
        size={18}
        tintColor={active ? accent : muted}
      />
      <View className="flex-1">
        <AppText className="text-sm font-semibold text-foreground">
          {active ? "You're listed" : "You're paused"}
        </AppText>
        <AppText className="mt-0.5 text-xs leading-4 text-muted">
          {active
            ? 'People can find you and send requests. Takes effect right away.'
            : "You're off the roster. Chats you already have still work."}
        </AppText>
      </View>
      <Switch
        isSelected={active}
        onSelectedChange={(next) => {
          Keyboard.dismiss();
          playSoftPress();
          onChange(next);
        }}
        accessibilityLabel="Available for new conversations"
      >
        <Switch.Thumb />
      </Switch>
    </View>
  );
}

function EditSkeleton() {
  return (
    <View className="flex-1 gap-4 bg-background px-5 pt-6">
      <Skeleton className="h-32 w-32 self-center rounded-full" />
      <Skeleton className="h-12 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-3xl" />
    </View>
  );
}
