# NATIONVK Learning Platform

Bilingual Bangla + English learning app with Firebase backend and Android debug APK pipeline.

## Question Bank and examination features

- Admin Panel: add, edit, publish/unpublish and delete MCQs.
- CSV bulk import. Export an Excel workbook as UTF-8 CSV before upload.
- AI Question Generator creates unpublished drafts for human review.
- Students choose one or more subjects, question count and difficulty.
- Exams randomly select published questions and show attempted, correct, wrong, unanswered, accuracy, time and subject-wise performance.
- Each signed-in learner's exam history is stored privately in Firestore.

## Firebase setup

1. Configure the Firebase Web App in `firebase-config.js`.
2. Enable Email/Password in Firebase Authentication.
3. Create Cloud Firestore.
4. Deploy `firestore.rules` and the Cloud Functions.
5. Add your hosting domain under Authentication > Settings > Authorized domains.
6. Cloud Functions and AI usage may incur charges; use the Firebase Blaze plan before deployment.

## Grant the Question Admin role

Question management and AI generation require Firebase custom claim `admin: true`. Never grant this role from client-side code.

Use a trusted computer or Google Cloud Shell with Firebase Admin SDK credentials. Do not commit the service-account JSON.

```bash
npm install firebase-admin
export GOOGLE_APPLICATION_CREDENTIALS="/secure/path/service-account.json"
node scripts/set-question-admin.js YOUR_FIREBASE_USER_UID
```

Get the UID from Firebase Console > Authentication > Users after creating your own account. Sign out and sign in again after the claim is granted. Keep the service-account file private and remove temporary copies after use.

## AI question generation

Set the OpenAI API key as a Firebase Secret, then deploy:

```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase deploy --only functions,firestore:rules
```

AI generation is admin-only and limited to 10 requests per account per UTC day. Generated MCQs remain unpublished drafts until an admin reviews and saves them. OpenAI API billing is separate from ChatGPT subscriptions.

## CSV template

Required headers:
`subject,topic,question,optionA,optionB,optionC,optionD,correctIndex`

Optional headers:
`explanation,difficulty,language,published`

- `correctIndex`: zero-based (A=0, B=1, C=2, D=3).
- `difficulty`: Easy, Medium or Hard.
- `language`: en, bn or both.
- `published`: true or false; defaults to true if omitted.
- Quote fields containing commas, quotes or line breaks.
- Maximum 400 questions per upload.

## Android build

Push to main or run Actions > Build Android APK. Download the `nationvk-learning-debug-apk` artifact from the successful workflow run.

## Security notes

- Students can read published questions only.
- Only Firebase custom-claim admins can manage questions and generate AI drafts.
- Users can read only their own exam results.
- Never commit OpenAI API keys, service-account JSON or private credentials.
- Add Firebase App Check and monitoring before public launch.

**NATIONVK — Learning without limits.**
