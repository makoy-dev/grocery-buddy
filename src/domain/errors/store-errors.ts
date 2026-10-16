export class DuplicateStoreNameError extends Error {
  constructor() {
    super('A store with this name already exists.');
    this.name = 'DuplicateStoreNameError';
  }
}

export class StoreDeletionBlockedError extends Error {
  constructor() {
    super('This store has saved prices or shopping history and cannot be deleted.');
    this.name = 'StoreDeletionBlockedError';
  }
}
