import { useState } from 'react';
import { AppDialog, type AppDialogState } from '@/components/ui/app-dialog';

export function useAppDialog() {
  const [dialog, setDialog] = useState<AppDialogState | null>(null);
  const showDialog = (state: AppDialogState) => setDialog(state);
  const dialogElement = <AppDialog visible={dialog !== null} {...(dialog ?? { title: '' })} onCancel={() => setDialog(null)} />;
  return { showDialog, dialogElement };
}
