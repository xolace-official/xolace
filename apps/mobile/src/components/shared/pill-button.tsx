import { Pressable } from 'react-native';
import { AppText } from '@/src/components/shared/app-text';
import { cn } from '@/src/lib/utils';
import { playAffirmativePress } from '@/src/lib/haptics';

type Props = {
  label: string;
  onPress: () => void;
  className?: string;
  disabled?: boolean;
};

export const PillButton = ({ label, onPress, className, disabled }: Props) => {
  const handlePress = () => {
    playAffirmativePress();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      className={cn(
        'self-center rounded-full bg-accent/10 px-8 py-3',
        disabled && 'opacity-40',
        className,
      )}
    >
      <AppText className="text-center text-base font-semibold text-accent">
        {label}
      </AppText>
    </Pressable>
  );
};
