# NATIONVK Learning Platform

Bilingual (Bangla + English), offline-first learning and exam-preparation app with a web/PWA frontend and an automated Android debug APK pipeline.

## Features currently in the starter

- Student dashboard and subject discovery
- MCQ practice with instant feedback and explanations
- Timed mock exam and local result history
- Study planner, bookmarks, progress tracking
- Bangla/English toggle and dark/light theme
- Local-first storage and PWA offline cache
- Firebase Email/Password authentication integration
- Firestore storage for a learner's progress, tasks and bookmarks
- Capacitor Android wrapper and GitHub Actions debug APK artifact

## Firebase setup (required to activate cloud services)

1. Create a Firebase project at https://console.firebase.google.com/.
2. Add a Web App in Project settings.
3. Copy its web configuration into firebase-config.js, replacing every YOUR_* placeholder.
4. In Firebase Authentication, enable the Email/Password provider.
5. Create a Cloud Firestore database.
6. Publish the rules from firestore.rules in Firestore Rules.
7. In Authentication > Settings > Authorized domains, add the domain used to host the web app (for example, your GitHub Pages domain).

Firebase web config values are client identifiers, not admin credentials. Never put service-account JSON or private server keys in this repository. Firestore rules restrict each signed-in user to their own private learning document.

## Run locally

Serve the repository over localhost or HTTPS (service workers do not work from ordinary file:// pages). The app can also be installed as a PWA from a supported browser.

## Android APK from GitHub Actions

Every push to main runs Build Android APK. The workflow installs Capacitor, generates the Android project, builds a debug APK and uploads it as the artifact nationvk-learning-debug-apk.

To download it: open the repository's Actions tab > select the latest Build Android APK run > scroll to Artifacts > download nationvk-learning-debug-apk.

Manual run: Actions > Build Android APK > Run workflow.

This is a debug APK for testing. A distributable/release APK requires Android signing configuration; keep signing keys and passwords in GitHub Actions Secrets, never in source control.

## Current limitations

- Firebase is integrated but remains inactive until firebase-config.js is populated and Firebase Console setup is completed.
- Cloud sync currently covers progress, study tasks and bookmarks. Conflict resolution and robust multi-device merge policies are future work.
- Teacher/admin roles, course authoring, live classes, video hosting and AI tutor are not implemented yet.
- GitHub Actions builds a debug APK; it does not publish to Google Play.

## Project identity

**NATIONVK** — Learning without limits.
