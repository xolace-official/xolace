import { View } from 'react-native';
import { Description, Input, Label, TextArea, TextField } from 'heroui-native';
import { AppText } from '@/src/components/shared/app-text';
import { cn } from '@/src/lib/utils';
import { BIO_MAX_LENGTH, NAME_MAX_LENGTH } from './steps';

export function NameStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <View className="pt-4">
      <TextField>
        <Label>Display name</Label>
        <Input
          value={value}
          onChangeText={onChange}
          placeholder="Maya"
          maxLength={NAME_MAX_LENGTH}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
        />
        <Description>Your real name is never shown — only what you type here.</Description>
      </TextField>
    </View>
  );
}

export function BioStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const remaining = BIO_MAX_LENGTH - value.length;

  return (
    <View className="gap-1.5 pt-4">
      <TextField>
        <Label>Bio</Label>
        <TextArea
          value={value}
          onChangeText={onChange}
          placeholder="Here for the nights that feel too loud. I don't scare easy, and I won't try to fix you."
          maxLength={BIO_MAX_LENGTH}
          numberOfLines={4}
        />
      </TextField>
      <AppText
        className={cn(
          'text-right text-[11px]',
          remaining <= 20 ? 'text-warning' : 'text-muted',
        )}
      >
        {value.length} / {BIO_MAX_LENGTH}
      </AppText>
    </View>
  );
}
