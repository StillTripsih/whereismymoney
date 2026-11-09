# Android release preparation

## Reserved identity

- Application ID: `com.stilltripsih.whereismymoney`
- Store name: `WHERE IS MY MONEY`
- First public release: free
- Data: local on-device storage; no account
- Receipt AI: user supplies their own Gemini key

## What is ready

The public WIMM web build is separate from the active source project. It uses a new local IndexedDB name, has no shared Gemini key, and can be packaged as a Capacitor Android application without exposing user records.

## Native wrapper prerequisite

The Capacitor Android dependencies could not be installed reliably in this environment, and this computer has no detected JDK or Android SDK. No generated `android/` folder or `.aab` is claimed as ready.

Once Android Studio, a JDK, and the Android SDK are installed, the exact next commands are:

```bash
npm install @capacitor/core@7 @capacitor/cli@7 @capacitor/android@7 --save
```

Create `capacitor.config.ts`:

```ts
import type { CapacitorConfig } from '@capacitor/cli';
export default {
  appId: 'com.stilltripsih.whereismymoney',
  appName: 'WHERE IS MY MONEY',
  webDir: 'build',
  bundledWebRuntime: false,
} satisfies CapacitorConfig;
```

Then:

```bash
npm run build
npx cap add android
npx cap sync android
cd android
gradlew bundleRelease
```

The expected upload file is `android/app/build/outputs/bundle/release/app-release.aab`. The upload keystore and `key.properties` stay outside Git and are ignored by `.gitignore`.

Before Play Console upload, install the signed release on a physical Android device and check first start, local records after restart, import/export, camera/microphone approval and denial, and offline launch.
