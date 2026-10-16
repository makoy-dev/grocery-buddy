import { create } from 'zustand';

import type { StoreSummary } from '@/domain/entities/store';

type StoreSelectionState = {
  selectedStore: StoreSummary | null;
  hydrated: boolean;
  setSelectedStore: (store: StoreSummary | null) => void;
  setHydrated: (hydrated: boolean) => void;
};

export const useStoreSelection = create<StoreSelectionState>((set) => ({
  selectedStore: null,
  hydrated: false,
  setSelectedStore: (selectedStore) => set({ selectedStore }),
  setHydrated: (hydrated) => set({ hydrated }),
}));
