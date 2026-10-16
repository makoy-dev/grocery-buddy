export type Store = {
  id: number;
  name: string;
  normalizedName: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateStoreInput = {
  name: string;
  isFavorite?: boolean;
};

export function normalizeStoreName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}
