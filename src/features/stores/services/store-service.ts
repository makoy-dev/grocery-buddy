import { DuplicateStoreNameError, StoreDeletionBlockedError } from '@/domain/errors/store-errors';
import {
  normalizeStoreName,
  type CreateStoreInput,
  type Store,
  type StoreSummary,
  type UpdateStoreInput,
} from '@/domain/entities/store';
import type { SettingsRepository } from '@/domain/interfaces/settings-repository';
import type { StoreRepository } from '@/domain/interfaces/store-repository';

export const SELECTED_STORE_SETTING_KEY = 'selected_store_id';

export class StoreService {
  constructor(
    private readonly stores: StoreRepository,
    private readonly settings: SettingsRepository,
  ) {}

  list(search = ''): Promise<StoreSummary[]> {
    return this.stores.list(search);
  }

  getById(id: number): Promise<StoreSummary | null> {
    return this.stores.findSummaryById(id);
  }

  async create(input: CreateStoreInput): Promise<Store> {
    await this.assertNameAvailable(input.name);
    return this.stores.create(input);
  }

  async update(id: number, input: UpdateStoreInput): Promise<Store> {
    await this.assertNameAvailable(input.name, id);
    return this.stores.update(id, input);
  }

  async setFavorite(id: number, isFavorite: boolean): Promise<Store> {
    return this.stores.setFavorite(id, isFavorite);
  }

  async delete(id: number): Promise<void> {
    const dependencies = await this.stores.getDeletionDependencies(id);
    if (dependencies.productCount > 0 || dependencies.historyCount > 0 || dependencies.sessionCount > 0) {
      throw new StoreDeletionBlockedError();
    }

    await this.stores.delete(id);
    const selectedStoreId = await this.getSelectedStoreId();
    if (selectedStoreId === id) {
      await this.settings.delete(SELECTED_STORE_SETTING_KEY);
    }
  }

  async select(id: number): Promise<StoreSummary> {
    const store = await this.stores.findSummaryById(id);
    if (!store) {
      throw new Error('The selected store no longer exists.');
    }

    await this.settings.set(SELECTED_STORE_SETTING_KEY, String(id));
    return store;
  }

  async getSelected(): Promise<StoreSummary | null> {
    const selectedStoreId = await this.getSelectedStoreId();
    if (selectedStoreId === null) {
      return null;
    }

    const store = await this.stores.findSummaryById(selectedStoreId);
    if (!store) {
      await this.settings.delete(SELECTED_STORE_SETTING_KEY);
      return null;
    }
    return store;
  }

  private async getSelectedStoreId(): Promise<number | null> {
    const value = await this.settings.get(SELECTED_STORE_SETTING_KEY);
    if (value === null) {
      return null;
    }

    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }

  private async assertNameAvailable(name: string, excludingId?: number): Promise<void> {
    const normalizedName = normalizeStoreName(name);
    if (!normalizedName) {
      throw new Error('Store name is required.');
    }

    const existingStore = await this.stores.findByNormalizedName(normalizedName, excludingId);
    if (existingStore) {
      throw new DuplicateStoreNameError();
    }
  }
}
