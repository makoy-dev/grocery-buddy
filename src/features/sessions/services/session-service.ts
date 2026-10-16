import { parsePhpToCents, type PriceAmount } from '@/features/pricing/services/pricing-service';
import type { ShoppingSession } from '@/domain/entities/shopping-session';
import type { SessionRepository } from '@/domain/interfaces/session-repository';

export class SessionService {
  constructor(private readonly sessions: SessionRepository) {}
  start(storeId: number): Promise<ShoppingSession> { return this.sessions.start(storeId); }
  getActive(storeId: number): Promise<ShoppingSession | null> { return this.sessions.findActive(storeId); }
  history(storeId?: number): Promise<ShoppingSession[]> { return this.sessions.listHistory(storeId); }
  complete(id: number, actualAmount: PriceAmount | null): Promise<ShoppingSession> { return this.sessions.complete(id, actualAmount === null ? null : parsePhpToCents(actualAmount)); }
  discard(id: number): Promise<ShoppingSession> { return this.sessions.discard(id); }
  setBudget(id: number, amount: PriceAmount | null): Promise<ShoppingSession> { return this.sessions.setBudget(id, amount === null ? null : parseBudgetCents(amount)); }
}

function parseBudgetCents(value: PriceAmount): number {
  const text = typeof value === 'number' ? String(value) : value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error('Enter a valid non-negative PHP budget.');
  const [whole, fraction = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('Enter a valid non-negative PHP budget.');
  return cents;
}
