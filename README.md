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
- NATIONVK AI tutor through a secure Firebase callable Cloud Function (OpenAI API)
- Per-user AI chat history synced to private Firestore data
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

## NATIONVK AI setup

The app includes an AI tutor UI and a secure callable Cloud Function. The OpenAI API key is stored as a Firebase Secret and is never shipped in the web app or APK.

1. Use a Firebase project with the Blaze (pay-as-you-go) plan; Cloud Functions deployment and AI API calls may incur charges.
2. Install the Firebase CLI and sign in: `npm install -g firebase-tools` then `firebase login`.
3. Select your Firebase project in this repository: `firebase use YOUR_PROJECT_ID`.
4. Set the server-side secret: `firebase functions:secrets:set OPENAI_API_KEY` and paste your OpenAI API key into the secure CLI prompt. Never commit this key or put it in `firebase-config.js`.
5. Deploy the function and Firestore rules: `firebase deploy --only functions,firestore:rules`.
6. Rebuild the Android APK from GitHub Actions after the web changes are pushed.

The AI tutor requires a signed-in Firebase user. Chat history is stored at `users/{uid}/private/aiChat`, protected by the existing owner-only Firestore rule. Each request is limited to 16 messages and 4,000 characters per message. Add App Check and stronger usage controls before a public launch.

**Important:** NATIONVK AI uses the OpenAI API with separate API billing. It does not connect to or use a ChatGPT subscription/session.
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
- Teacher/admin roles, course authoring, live classes and video hosting are not implemented yet. AI tutor deployment still requires Firebase Secret setup and Cloud Functions deployment.
- GitHub Actions builds a debug APK; it does not publish to Google Play.

## Project identity

**NATIONVK** — Learning without limits.
