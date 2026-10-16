import { useCallback, useEffect } from 'react';

import type { StoreSummary } from '@/domain/entities/store';
import { useStoreService } from '@/features/stores/hooks/use-store-service';
import { useStoreSelection } from '@/features/stores/state/store-selection';

export function useSelectedStore() {
  const service = useStoreService();
  const selectedStore = useStoreSelection((state) => state.selectedStore);
  const hydrated = useStoreSelection((state) => state.hydrated);
  const setSelectedStore = useStoreSelection((state) => state.setSelectedStore);
  const setHydrated = useStoreSelection((state) => state.setHydrated);

  useEffect(() => {
    if (hydrated) {
      return;
    }

    void service.getSelected().then((store) => {
      setSelectedStore(store);
      setHydrated(true);
    });
  }, [hydrated, service, setHydrated, setSelectedStore]);

  const selectStore = useCallback(
    async (id: number): Promise<StoreSummary> => {
      const store = await service.select(id);
      setSelectedStore(store);
      return store;
    },
    [service, setSelectedStore],
  );

  const clearSelectedStore = useCallback(() => setSelectedStore(null), [setSelectedStore]);

  return {
    selectedStore,
    isLoading: !hydrated,
    selectStore,
    clearSelectedStore,
  };
}
