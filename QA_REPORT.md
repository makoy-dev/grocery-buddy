# Grocery Godz production-readiness QA report

Date: 2026-10-17  
Scope: milestones 1–15, offline Expo SDK 58 application

## Automated checks passed

- TypeScript strict check: `npm.cmd run typecheck`
- ESLint: `npm.cmd run lint -- --no-cache`
- Jest: `npm.cmd test -- --runInBand` — **9 suites, 39 tests passed**
- Fresh SQLite initialization and migration suite
- Versioned migrations through schema version 6, including upgrade/idempotency checks
- Foreign-key enforcement and one-active-session-per-store constraint
- Store duplicate-name protection
- Product barcode and archive behavior
- Store-isolated pricing and transactional price history
- Scanner normalization, unknown/missing/priced outcomes, and duplicate-event throttling
- Cart quantity, totals, snapshots, removal, and multi-store isolation
- Shopping session persistence, completion, actual checkout totals, and store switching
- Shopping lists, history, comparisons, reports, budget calculations
- Backup export/import, malformed data rejection, duplicate IDs, relationship validation, and rollback preservation

The new end-to-end business-rule test is `src/database/__tests__/production-workflow.integration.test.ts`. Backup-specific coverage is in `src/features/settings/__tests__/backup.integration.test.ts`.

## Static integration review

| Area | Result |
| --- | --- |
| Database transactions and parameterized queries | Passed review; writes use repository transactions and prepared parameters |
| Migrations | Passed review; forward-only migrations, schema tracking, no ordinary-launch data drops |
| Camera lifecycle | Passed static review; camera is mounted only while scanning, pauses after accepted detection, supports resume/cancel, permission denial, manual fallback, and torch |
| Scan throttling | Passed; repeated barcode events are gated before lookup |
| Navigation and safe areas | Passed static review; routes use Expo Router and screens use safe-area containers |
| Loading, empty, and error states | Present across core screens and settings/report flows |
| Accessibility | Barcode inputs and scanner controls have labels; report tabs and chart bars expose accessibility labels |
| Offline behavior | No runtime API/backend/network calls found in application code |

## Critical scenario coverage

The automated workflow covers empty database setup, three stores (SM, Robinsons, Puregold), one shared barcode, distinct store prices, missing-price and unknown-product outcomes, cart quantity totals, separate store sessions, session completion with actual checkout, and persisted historical values. Existing comparison, history, reports, and backup tests cover the remaining local-data paths.

## Not executed on a physical device or emulator

- First-launch UI flow and cold-start persistence
- Actual camera permission prompts, physical EAN/UPC scans, torch behavior, and camera lifecycle on Android/iOS
- Airplane-mode validation on a device
- Native file picker/share flow for JSON backups and CSV exports
- Restore through a user-selected file and recovery after an interrupted native file operation
- Keyboard behavior, hardware back handling, and visual layout across phone sizes
- Light/dark/system theme behavior on the installed Expo Go binary
- Vibration behavior and audio behavior

These require Android-first device testing and a separate iOS pass where available. Unit/integration tests are not end-to-end device proof.

## Known failures and release blockers

1. `npm.cmd run doctor` did not complete in this environment because Expo Doctor could not access the network. Dependency compatibility should be rechecked in a network-enabled environment.
2. Expo Go reported `Cannot find native module 'ExponentAV'` when `expo-av` was attempted. The dependency and runtime import were removed so Expo Go remains usable. Scanner vibration works; scan sound requires a custom Expo development build that includes an audio module. If scan sound is a release requirement, this is a release blocker until that build is created and tested.
3. Native backup picker/share and camera workflows remain unverified on hardware.

## Recommended release gate

Create an SDK 58 Android development build, perform the critical scenario list with airplane mode enabled, verify backup restore on a second install, and repeat the scanner/backup/theme checks on iOS before calling the app production-ready.
