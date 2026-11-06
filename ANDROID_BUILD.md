# Android APK build path

This repository currently ships an offline-first PWA starter. To package it as an Android APK:

1. Install Node.js LTS and Android Studio on a computer.
2. Clone this repository: `git clone https://github.com/NATIONVK/Job_Pro.git`
3. Run:

```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "NATIONVK Learn" "com.nationvk.learn" --web-dir=.
npx cap add android
npx cap sync android
npx cap open android
```

4. In Android Studio choose Build > Build Bundle(s) / APK(s) > Build APK(s).

For CI builds, add a GitHub Actions workflow after the Android project is generated. Keep signing keys and service credentials in GitHub Actions Secrets; never commit them.

## Current limitations

- Authentication is currently a local guest profile, not cloud authentication.
- Offline caching and localStorage are implemented for the starter content and user progress.
- Real cross-device sync requires a configured backend (for example Firebase or Supabase), security rules, and conflict handling.
- Teacher/admin roles and AI assistance are roadmap features, not yet live.
