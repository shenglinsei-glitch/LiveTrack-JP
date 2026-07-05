import { useCallback, useState } from 'react';

type MaybePromise<T> = T | Promise<T>;

interface UseUnsavedChangesGuardOptions {
  isDirty: boolean;
  isNewDraft?: boolean;
  onBack: () => void;
  onSaveAndBack: () => MaybePromise<boolean | void>;
  onDiscard?: () => MaybePromise<boolean | void>;
}

export const useUnsavedChangesGuard = ({
  isDirty,
  isNewDraft = false,
  onBack,
  onSaveAndBack,
  onDiscard,
}: UseUnsavedChangesGuardOptions) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const shouldConfirm = isDirty || isNewDraft;

  const requestBack = useCallback(() => {
    if (shouldConfirm) {
      setIsDialogOpen(true);
      return;
    }
    onBack();
  }, [onBack, shouldConfirm]);

  const saveAndBack = useCallback(async () => {
    const result = await onSaveAndBack();
    if (result === false) return;
    setIsDialogOpen(false);
  }, [onSaveAndBack]);

  const discardAndBack = useCallback(async () => {
    const result = await onDiscard?.();
    if (result === false) return;
    setIsDialogOpen(false);
    onBack();
  }, [onBack, onDiscard]);

  const cancelBack = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  return {
    isDialogOpen,
    requestBack,
    saveAndBack,
    discardAndBack,
    cancelBack,
  };
};
