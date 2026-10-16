import type { Product } from '@/domain/entities/product';
import type { StoreProductPrice } from '@/domain/entities/store-product-price';
import type { PricingRepository } from '@/domain/interfaces/pricing-repository';
import type { ProductRepository } from '@/domain/interfaces/product-repository';

export type SupportedBarcodeType = 'ean13' | 'ean8' | 'upc_a' | 'upc_e';
export type BarcodeLookup =
  | { kind: 'unknown'; barcode: string }
  | { kind: 'missing-price'; barcode: string; product: Product }
  | { kind: 'priced'; barcode: string; product: Product; price: StoreProductPrice };

export type ScanGateState = { barcode: string | null; at: number };

export function acceptScan(state: ScanGateState, barcode: string, now = Date.now(), windowMs = 1500): boolean {
  if (state.barcode === barcode && now - state.at < windowMs) return false;
  state.barcode = barcode;
  state.at = now;
  return true;
}

export function normalizeBarcode(raw: string, type?: string): string | null {
  const value = raw.trim();
  if (!/^\d+$/.test(value)) return null;
  const normalizedType = type?.toLowerCase().replace('_', '-');
  const expectedLength = normalizedType === 'ean13' ? 13 : normalizedType === 'ean8' || normalizedType === 'upc-e' ? 8 : normalizedType === 'upc-a' ? 12 : null;
  if (expectedLength ? value.length !== expectedLength : ![8, 12, 13].includes(value.length)) return null;
  return value;
}

function barcodeCandidates(barcode: string): string[] {
  if (barcode.length === 12) return [barcode, `0${barcode}`];
  if (barcode.length === 13 && barcode.startsWith('0')) return [barcode, barcode.slice(1)];
  return [barcode];
}

export class BarcodeLookupService {
  constructor(private readonly products: ProductRepository, private readonly prices: PricingRepository) {}

  async lookup(storeId: number, rawBarcode: string, type?: string): Promise<BarcodeLookup> {
    const barcode = normalizeBarcode(rawBarcode, type);
    if (!barcode) throw new Error('Only EAN-13, EAN-8, UPC-A, and UPC-E barcodes are supported.');
    let product: Product | null = null;
    for (const candidate of barcodeCandidates(barcode)) {
      product = await this.products.findByBarcode(candidate);
      if (product) break;
    }
    if (!product) return { kind: 'unknown', barcode };
    const price = await this.prices.findCurrent(storeId, product.id);
    return price ? { kind: 'priced', barcode, product, price } : { kind: 'missing-price', barcode, product };
  }
}
