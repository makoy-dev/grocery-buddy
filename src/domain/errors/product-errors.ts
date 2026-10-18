export class DuplicateProductBarcodeError extends Error {
  constructor(barcode?: string) {
    super(barcode
      ? `Barcode ${barcode} is already registered. Open the existing product instead.`
      : 'A product with this barcode already exists.');
    this.name = 'DuplicateProductBarcodeError';
  }
}
