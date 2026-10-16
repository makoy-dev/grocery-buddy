import type { DatabaseConnection } from '@/database/connection';
import type { AppSettingRow } from '@/database/models';
import type { SettingsRepository } from '@/domain/interfaces/settings-repository';

export class SQLiteSettingsRepository implements SettingsRepository {
  constructor(private readonly database: DatabaseConnection) {}

  async get(key: string): Promise<string | null> {
    const row = await this.database.first<AppSettingRow>(
      'SELECT value FROM app_settings WHERE key = ?',
      [key],
    );
    return row?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    await this.database.run(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value],
    );
  }

  async delete(key: string): Promise<void> {
    await this.database.run('DELETE FROM app_settings WHERE key = ?', [key]);
  }
}
