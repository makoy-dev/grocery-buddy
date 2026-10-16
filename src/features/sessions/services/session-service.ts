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
}
