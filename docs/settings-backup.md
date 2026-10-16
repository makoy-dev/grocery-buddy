# Settings and offline backup

Settings are stored in `app_settings`. The current supported keys are the selected/preferred store, theme preference (`system`, `light`, or `dark`), and scanner vibration/sound preferences. Currency is fixed to PHP and uses the shared integer-cents formatter.

## Backup format

Exports are JSON objects with `format: "grocery-godz-backup"`, `version: 1`, an `exportedAt` ISO timestamp, and all supported local tables. No credentials, tokens, analytics identifiers, or remote data are included.

Import first validates the format, table presence, duplicate IDs, and foreign-key references. Only validated backups enter the exclusive SQLite transaction. Rows are deleted and restored in foreign-key-safe order; SQLite rollback preserves the previous database if any insert is interrupted or rejected.

The Settings screen uses Expo FileSystem's SDK 58 file and directory pickers and React Native's native share interface. Backup and CSV files remain local unless the user explicitly chooses a destination or share target. A full history CSV contains completed-session item snapshots, quantities, integer-cent prices, estimates, and recorded actual totals.
