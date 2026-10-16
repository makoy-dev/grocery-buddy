import { Modal, Pressable, Text, View } from 'react-native';

export type AppDialogState = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm?: () => void;
};

type Props = AppDialogState & { visible: boolean; onCancel: () => void };

export function AppDialog({ visible, title, message, confirmLabel = 'OK', cancelLabel, destructive, onConfirm, onCancel }: Props) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}><View className="flex-1 items-center justify-center bg-black/45 px-6"><View className="w-full max-w-sm rounded-3xl bg-surface p-6 shadow-2xl dark:bg-surface-dark"><View className={`mb-4 h-12 w-12 items-center justify-center rounded-2xl ${destructive ? 'bg-red-100 dark:bg-red-900/30' : 'bg-primary/10 dark:bg-primary-dark/20'}`}><Text className={`text-xl font-bold ${destructive ? 'text-red-700 dark:text-red-300' : 'text-primary dark:text-primary-dark'}`}>{destructive ? '!' : '✓'}</Text></View><Text className="text-xl font-bold text-ink dark:text-ink-dark">{title}</Text>{message && <Text className="mt-2 text-base leading-6 text-muted dark:text-muted-dark">{message}</Text>}<View className="mt-6 flex-row justify-end gap-3">{cancelLabel && <Pressable className="rounded-xl px-4 py-3" onPress={onCancel}><Text className="font-semibold text-muted dark:text-muted-dark">{cancelLabel}</Text></Pressable>}<Pressable className={`rounded-xl px-4 py-3 ${destructive ? 'bg-red-600' : 'bg-primary'}`} onPress={() => { onConfirm?.(); onCancel(); }}><Text className="font-semibold text-white">{confirmLabel}</Text></Pressable></View></View></View></Modal>;
}
