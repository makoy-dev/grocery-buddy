export class DuplicateProductBarcodeError extends Error {
  constructor() {
    super('A product with this barcode already exists.');
    this.name = 'DuplicateProductBarcodeError';
  }
}
