# Android APK build

The repository uses Capacitor to package the web app for Android.

## Automated build

The GitHub Actions workflow at .github/workflows/build-android.yml runs on every push to main and can also be started manually.

It:
1. Installs Node.js dependencies.
2. Copies the web app into www/.
3. Generates the native Android project using Capacitor.
4. Builds a debug APK with Gradle.
5. Uploads app-debug.apk as the nationvk-learning-debug-apk workflow artifact.

Download: GitHub repository > Actions > latest Build Android APK run > Artifacts.

## Local build

Requirements: Node.js 20+, Java 21, Android SDK.

    npm install
    npm run build:android
    cd android
    ./gradlew assembleDebug

APK output: android/app/build/outputs/apk/debug/app-debug.apk.

## Release signing

The workflow intentionally creates a debug APK. For a signed release APK, configure an Android keystore and store the keystore/password values in GitHub Actions Secrets. Never commit signing keys or passwords.
