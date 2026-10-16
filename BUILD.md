# Android APK build and offline installation

Grocery Godz is configured for an installable Android APK through the EAS `apk` profile. The app remains local/offline at runtime; EAS is only used to produce the native binary.

## Prerequisites

1. Install Node.js and npm.
2. From the project directory, install dependencies:

   ```bash
   npm install
   ```

3. Install the EAS CLI if it is not already available:

   ```bash
   npm install --global eas-cli
   ```

4. Sign in to an Expo account:

   ```bash
   eas login
   ```

5. Link this local project to an EAS project once (if it is not already linked):

   ```bash
   eas init
   ```

The Expo account and Android signing credential setup are developer-authenticated steps. EAS can generate/manage signing credentials after confirmation, or an existing keystore can be supplied by the developer. Do not commit credentials or keystore files.

## Build the APK

Validate the resolved Expo configuration first:

```bash
npx expo config --type public
npm run typecheck
npm run lint
npm test -- --runInBand
```

Build the internal-distribution APK:

```bash
eas build --platform android --profile apk
```

When the build completes, EAS provides an authenticated artifact URL. Download the APK from that URL and install it on an Android device. This project does not publish to Google Play.

## Local installation and offline acceptance

With Android Debug Bridge available, install a downloaded APK with:

```bash
adb install -r GroceryGodz.apk
```

Then enable airplane mode and verify:

- The app launches after a cold start with an empty database.
- Stores, products, prices, sessions, carts, lists, history, reports, and settings remain usable.
- Barcode scanning works with camera permission already granted; manual barcode entry works regardless.
- Prices remain isolated by store and missing prices remain unknown.
- Active sessions and cart totals survive an app restart.
- Backup export/import and CSV export work through the device file/share UI.
- No screen attempts to load a remote service or requires an account.

## Configuration notes

- Display name: `Grocery Godz`
- Android package: `com.grocerygodz.grocerybuddy`
- Android permission allowlist: `CAMERA` only
- Camera permission wording: `Allow Grocery Godz to scan grocery barcodes.`
- APK profile: `build.apk` with `android.buildType = apk`
- Production profile: `build.production` produces an Android App Bundle and is not used for direct APK installation.

An APK is not claimed here; it exists only after the authenticated EAS build succeeds.
